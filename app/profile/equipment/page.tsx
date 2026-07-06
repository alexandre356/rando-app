"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";

const EQUIPMENT_TYPES = [
  "Voile",
  "Sellette",
  "Secours",
  "Casque",
  "Vario",
  "Radio",
  "GPS",
  "Sac de transport",
  "Autre",
];

type Equipment = {
  id: string;
  name: string;
  type: string | null;
  brand: string | null;
  model: string | null;
  purchase_date: string | null;
  last_check_date: string | null;
  next_check_date: string | null;
  flight_hours: number;
  notes: string | null;
};

type Doc = {
  name: string;
  url: string;
};

export default function EquipmentPage() {
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [docs, setDocs] = useState<Record<string, Doc[]>>({});
  const [flightMinutes, setFlightMinutes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [lastCheckDate, setLastCheckDate] = useState("");
  const [nextCheckDate, setNextCheckDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("equipment")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const equipmentList = data || [];
      setEquipment(equipmentList);

      // Calculer les heures depuis le journal de vol
      const { data: flightData } = await supabase
        .from("flight_logs")
        .select("equipment_used, duration_minutes")
        .eq("user_id", user.id)
        .not("equipment_used", "is", null);

      const minutesMap: Record<string, number> = {};
      for (const flight of flightData || []) {
        if (!flight.equipment_used || !flight.duration_minutes) continue;
        const equipNames = flight.equipment_used.split(", ");
        for (const eqName of equipNames) {
          const trimmed = eqName.trim();
          minutesMap[trimmed] = (minutesMap[trimmed] || 0) + flight.duration_minutes;
        }
      }
      setFlightMinutes(minutesMap);

      // Charger les documents
      const docsMap: Record<string, Doc[]> = {};
      for (const item of equipmentList) {
        const { data: files } = await supabase.storage
          .from("equipment-docs")
          .list(item.id, { sortBy: { column: "created_at", order: "asc" } });

        if (files && files.length > 0) {
          docsMap[item.id] = files.map((file) => {
            const { data: urlData } = supabase.storage
              .from("equipment-docs")
              .getPublicUrl(`${item.id}/${file.name}`);
            return { name: file.name, url: urlData.publicUrl };
          });
        }
      }
      setDocs(docsMap);
      setLoading(false);
    }
    load();
  }, []);

  function resetForm() {
    setName(""); setType(""); setBrand(""); setModel("");
    setPurchaseDate(""); setLastCheckDate(""); setNextCheckDate("");
    setNotes("");
  }

  function formatHours(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h${m.toString().padStart(2, "0")}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from("equipment")
      .insert({
        user_id: userId,
        name,
        type: type || null,
        brand: brand || null,
        model: model || null,
        purchase_date: purchaseDate || null,
        last_check_date: lastCheckDate || null,
        next_check_date: nextCheckDate || null,
        flight_hours: 0,
        notes: notes || null,
      })
      .select("*")
      .single();

    if (error) { alert(error.message); setSubmitting(false); return; }

    setEquipment([data, ...equipment]);
    resetForm();
    setShowForm(false);
    setSubmitting(false);
  }

  async function handleDocUpload(equipmentId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      alert("Format non supporté. Utilisez PDF, JPG ou PNG.");
      return;
    }

    setUploadingFor(equipmentId);
    const fileName = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("equipment-docs")
      .upload(`${equipmentId}/${fileName}`, file);

    if (error) { alert(error.message); setUploadingFor(null); return; }

    const { data: urlData } = supabase.storage
      .from("equipment-docs")
      .getPublicUrl(`${equipmentId}/${fileName}`);

    setDocs((prev) => ({
      ...prev,
      [equipmentId]: [...(prev[equipmentId] || []), { name: fileName, url: urlData.publicUrl }],
    }));

    setUploadingFor(null);
  }

  async function deleteDoc(equipmentId: string, fileName: string) {
    await supabase.storage.from("equipment-docs").remove([`${equipmentId}/${fileName}`]);
    setDocs((prev) => ({
      ...prev,
      [equipmentId]: (prev[equipmentId] || []).filter((d) => d.name !== fileName),
    }));
  }

  async function deleteEquipment(id: string) {
    await supabase.from("equipment").delete().eq("id", id);
    setEquipment(equipment.filter((e) => e.id !== id));
  }

  async function updateNotes(id: string, newNotes: string) {
    setEquipment(equipment.map((e) => e.id === id ? { ...e, notes: newNotes } : e));
    await supabase.from("equipment").update({ notes: newNotes }).eq("id", id);
  }

  function getCheckStatus(nextCheckDate: string | null) {
    if (!nextCheckDate) return null;
    const today = new Date();
    const checkDate = new Date(nextCheckDate);
    const daysLeft = Math.ceil((checkDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: "Révision dépassée !", color: "text-red-400", bg: "bg-red-950 border-red-800" };
    if (daysLeft < 90) return { label: `Révision dans ${daysLeft} jours`, color: "text-orange-400", bg: "bg-orange-950 border-orange-800" };
    return { label: `Révision dans ${daysLeft} jours`, color: "text-green-400", bg: "" };
  }

  function getDocLabel(fileName: string) {
    const clean = fileName.replace(/^\d+-/, "");
    return clean.length > 30 ? clean.substring(0, 30) + "..." : clean;
  }

  function isImage(fileName: string) {
    return /\.(jpg|jpeg|png)$/i.test(fileName);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-400 text-xl">Chargement...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="p-10">
        <a href="/profile" className="text-gray-400 hover:text-green-400 transition mb-8 inline-block">
          &larr; Retour au profil
        </a>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold">Mon matériel</h1>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-500 hover:bg-green-600 transition px-5 py-3 rounded-xl font-semibold"
            >
              + Ajouter
            </button>
          )}
        </div>

        <p className="text-amber-400 italic text-sm mb-8">
          &ldquo;Le relief est là pour te rappeler ta finesse réelle.&rdquo;
        </p>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-zinc-900 border border-green-500 rounded-2xl p-6 mb-8 space-y-4"
          >
            <h2 className="text-xl font-bold">Nouvel équipement</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nom (ex: Alpha 6 taille S)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                required
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
              >
                <option value="">Type d&apos;équipement</option>
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Marque"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
              />
              <input
                type="text"
                placeholder="Modèle"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-xs mb-1">Date d&apos;achat</p>
                <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Dernière révision</p>
                <input type="date" value={lastCheckDate} onChange={(e) => setLastCheckDate(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Prochaine révision</p>
                <input type="date" value={nextCheckDate} onChange={(e) => setNextCheckDate(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" />
              </div>
            </div>

            <textarea
              placeholder="Notes (état, réparations, remarques...)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            />

            <div className="flex gap-4">
              <button type="submit" disabled={submitting} className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold disabled:opacity-50">
                {submitting ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="bg-zinc-700 hover:bg-zinc-600 transition px-6 py-3 rounded-xl font-semibold">
                Annuler
              </button>
            </div>
          </form>
        )}

        {equipment.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-xl mb-4">Aucun équipement enregistré.</p>
            <button onClick={() => setShowForm(true)} className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold">
              Ajouter mon premier équipement
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {equipment.map((item) => {
              const status = getCheckStatus(item.next_check_date);
              const itemDocs = docs[item.id] || [];
              const loggedMinutes = flightMinutes[item.name] || 0;

              return (
                <div key={item.id} className={`bg-zinc-900 border rounded-2xl p-6 ${status?.bg || "border-zinc-800"}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-xl font-bold">{item.name}</h2>
                        {item.type && (
                          <span className="text-xs bg-zinc-700 text-gray-300 px-3 py-1 rounded-full">{item.type}</span>
                        )}
                      </div>
                      {(item.brand || item.model) && (
                        <p className="text-gray-400 text-sm">{[item.brand, item.model].filter(Boolean).join(" — ")}</p>
                      )}
                    </div>
                    <button onClick={() => deleteEquipment(item.id)} className="text-zinc-600 hover:text-red-400 transition text-xs">
                      Supprimer
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {item.purchase_date && (
                      <div className="bg-black rounded-xl p-3">
                        <p className="text-gray-500 text-xs mb-1">Achat</p>
                        <p className="text-sm font-semibold">{new Date(item.purchase_date).toLocaleDateString("fr-FR")}</p>
                      </div>
                    )}
                    {item.last_check_date && (
                      <div className="bg-black rounded-xl p-3">
                        <p className="text-gray-500 text-xs mb-1">Dernière révision</p>
                        <p className="text-sm font-semibold">{new Date(item.last_check_date).toLocaleDateString("fr-FR")}</p>
                      </div>
                    )}
                    {item.next_check_date && (
                      <div className="bg-black rounded-xl p-3">
                        <p className="text-gray-500 text-xs mb-1">Prochaine révision</p>
                        <p className={`text-sm font-semibold ${status?.color}`}>{new Date(item.next_check_date).toLocaleDateString("fr-FR")}</p>
                      </div>
                    )}
                    <div className="bg-black rounded-xl p-3">
                      <p className="text-gray-500 text-xs mb-1">Heures de vol</p>
                      {loggedMinutes > 0 ? (
                        <div>
                          <p className="text-sm font-semibold text-green-400">{formatHours(loggedMinutes)}</p>
                          <p className="text-xs text-gray-600">depuis le journal de vol</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">Non enregistré</p>
                      )}
                    </div>
                  </div>

                  {status && <p className={`text-xs font-semibold mb-3 ${status.color}`}>{status.label}</p>}

                  <div className="mb-4">
                    <p className="text-gray-500 text-xs mb-2">Commentaires / Notes</p>
                    <textarea
                      value={item.notes || ""}
                      onChange={(e) => updateNotes(item.id, e.target.value)}
                      onBlur={(e) => updateNotes(item.id, e.target.value)}
                      placeholder="État de la voile, réparations effectuées, remarques..."
                      rows={3}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-green-500 resize-none"
                    />
                  </div>

                  <div className="border-t border-zinc-800 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-gray-400 text-sm font-semibold">Documents</p>
                      <label className="cursor-pointer text-xs bg-zinc-800 hover:bg-zinc-700 transition px-3 py-2 rounded-lg text-gray-300">
                        {uploadingFor === item.id ? "Upload..." : "+ Ajouter PDF / Photo"}
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => handleDocUpload(item.id, e)}
                          className="hidden"
                          disabled={uploadingFor === item.id}
                        />
                      </label>
                    </div>

                    {itemDocs.length === 0 ? (
                      <p className="text-gray-600 text-xs">Aucun document — facture, certificat de conformité, rapport de contrôle...</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {itemDocs.map((doc) => (
                          <div key={doc.name} className="flex items-center gap-2 bg-black border border-zinc-700 rounded-lg px-3 py-2">
                            <span className="text-xs text-gray-400">{isImage(doc.name) ? "🖼️" : "📄"}</span>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 transition">
                              {getDocLabel(doc.name)}
                            </a>
                            <button onClick={() => deleteDoc(item.id, doc.name)} className="text-zinc-600 hover:text-red-400 transition text-xs ml-1">x</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
