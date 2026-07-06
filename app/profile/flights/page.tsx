"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";

type FlightLog = {
  id: string;
  date: string;
  site_name: string | null;
  duration_minutes: number | null;
  elevation_gain: number | null;
  conditions: string | null;
  notes: string | null;
  rating: number | null;
  equipment_used: string | null;
};

type Site = {
  id: string;
  name: string;
};

type Equipment = {
  id: string;
  name: string;
  type: string | null;
  brand: string | null;
  model: string | null;
};

export default function FlightsPage() {
  const router = useRouter();
  const [flights, setFlights] = useState<FlightLog[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteId, setSiteId] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [elevationGain, setElevationGain] = useState("");
  const [conditions, setConditions] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(0);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: flightsData, error } = await supabase
        .from("flight_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (error) console.error(error);
      else setFlights(flightsData || []);

      const { data: sitesData } = await supabase
        .from("sites")
        .select("id, name")
        .eq("status", "approved")
        .order("name");

      setSites(sitesData || []);

      const { data: equipmentData } = await supabase
        .from("equipment")
        .select("id, name, type, brand, model")
        .eq("user_id", user.id)
        .order("type");

      setEquipment(equipmentData || []);
      setLoading(false);
    }
    load();
  }, []);

  function toggleEquipment(name: string) {
    setSelectedEquipment((prev) =>
      prev.includes(name) ? prev.filter((e) => e !== name) : [...prev, name]
    );
  }

  function handleSiteSelect(value: string) {
    setSiteId(value);
    const site = sites.find((s) => s.id === value);
    if (site) setSiteName(site.name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const totalMinutes =
      (durationHours ? Number(durationHours) * 60 : 0) +
      (durationMinutes ? Number(durationMinutes) : 0);

    const { data, error } = await supabase
      .from("flight_logs")
      .insert({
        user_id: user.id,
        date,
        site_name: siteName || null,
        site_id: siteId || null,
        duration_minutes: totalMinutes || null,
        elevation_gain: elevationGain ? Number(elevationGain) : null,
        conditions: conditions || null,
        notes: notes || null,
        rating: rating || null,
        equipment_used: selectedEquipment.length > 0 ? selectedEquipment.join(", ") : null,
      })
      .select("*")
      .single();

    if (error) { alert(error.message); setSubmitting(false); return; }

    setFlights([data, ...flights]);
    setDate(""); setSiteName(""); setSiteId("");
    setDurationHours(""); setDurationMinutes("");
    setElevationGain(""); setConditions(""); setNotes("");
    setRating(0); setSelectedEquipment([]); setShowForm(false); setSubmitting(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("flight_logs").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    setFlights(flights.filter((f) => f.id !== id));
  }

  function formatDuration(minutes: number | null): string {
    if (!minutes) return "?";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${m.toString().padStart(2, "0")}`;
  }

  const totalFlights = flights.length;
  const totalHours = Math.floor(flights.reduce((sum, f) => sum + (f.duration_minutes || 0), 0) / 60);
  const totalMinutes = flights.reduce((sum, f) => sum + (f.duration_minutes || 0), 0) % 60;

  const voiles = equipment.filter((e) => e.type === "Voile");
  const autresEquipements = equipment.filter((e) => e.type !== "Voile");

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

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-5xl font-bold">Journal de vol</h1>
          <p className="text-indigo-400 italic text-sm">&ldquo;Si tu ne sais pas où est l&apos;atterro, c&apos;est que tu es en cross.&rdquo;</p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold"
            >
              + Ajouter un vol
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-green-400">{totalFlights}</p>
            <p className="text-gray-400 text-sm mt-1">Vol(s) enregistré(s)</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-green-400">
              {totalHours}h{totalMinutes.toString().padStart(2, "0")}
            </p>
            <p className="text-gray-400 text-sm mt-1">Temps de vol total</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-green-400">
              {flights.reduce((sum, f) => sum + (f.elevation_gain || 0), 0).toLocaleString()} m
            </p>
            <p className="text-gray-400 text-sm mt-1">D+ total</p>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-zinc-900 border border-green-500 rounded-2xl p-6 mb-8 space-y-4"
          >
            <h2 className="text-xl font-bold">Nouveau vol</h2>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
              required
            />

            <select
              value={siteId}
              onChange={(e) => handleSiteSelect(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            >
              <option value="">Site (optionnel)</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Nom du site (si non listé)"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            />

            {equipment.length > 0 ? (
              <div>
                <p className="text-gray-300 text-sm mb-3">Équipement utilisé (sélection multiple)</p>

                {voiles.length > 0 && (
                  <div className="mb-3">
                    <p className="text-gray-500 text-xs mb-2 uppercase tracking-wide">Voiles</p>
                    <div className="flex flex-wrap gap-2">
                      {voiles.map((eq) => (
                        <button
                          key={eq.id}
                          type="button"
                          onClick={() => toggleEquipment(eq.name)}
                          className={`text-sm px-4 py-2 rounded-xl border transition ${
                            selectedEquipment.includes(eq.name)
                              ? "bg-green-500 border-green-500 text-white"
                              : "bg-black border-zinc-700 text-gray-300 hover:border-green-500"
                          }`}
                        >
                          {eq.name}
                          {eq.brand && <span className="text-xs opacity-70 ml-1">({eq.brand})</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {autresEquipements.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs mb-2 uppercase tracking-wide">Autre matériel</p>
                    <div className="flex flex-wrap gap-2">
                      {autresEquipements.map((eq) => (
                        <button
                          key={eq.id}
                          type="button"
                          onClick={() => toggleEquipment(eq.name)}
                          className={`text-sm px-4 py-2 rounded-xl border transition ${
                            selectedEquipment.includes(eq.name)
                              ? "bg-green-500 border-green-500 text-white"
                              : "bg-black border-zinc-700 text-gray-300 hover:border-green-500"
                          }`}
                        >
                          {eq.name}
                          {eq.type && <span className="text-xs opacity-70 ml-1">({eq.type})</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEquipment.length > 0 && (
                  <p className="text-green-400 text-xs mt-2">
                    Sélectionné : {selectedEquipment.join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-xs">
                Aucun équipement enregistré —{" "}
                <a href="/profile/equipment" className="text-green-400 hover:underline">
                  ajouter mon matériel
                </a>
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm mb-2">Durée du vol</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Heures"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    min={0}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                  />
                  <input
                    type="number"
                    placeholder="Minutes"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    min={0}
                    max={59}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                  />
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">D+ (m)</p>
                <input
                  type="number"
                  placeholder="Dénivelé +"
                  value={elevationGain}
                  onChange={(e) => setElevationGain(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                />
              </div>
            </div>

            <input
              type="text"
              placeholder="Conditions (vent, météo...)"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            />

            <textarea
              placeholder="Notes personnelles..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            />

            <div>
              <p className="text-gray-400 text-sm mb-2">Note du vol</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-2xl transition ${star <= rating ? "opacity-100" : "opacity-30"}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                {submitting ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-zinc-700 hover:bg-zinc-600 transition px-6 py-3 rounded-xl font-semibold"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {flights.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-xl mb-4">Aucun vol enregistré pour l&apos;instant.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold"
            >
              Enregistrer mon premier vol
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {flights.map((flight) => (
              <div key={flight.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-xl font-bold">{flight.site_name || "Site inconnu"}</h2>
                    <p className="text-gray-400 text-sm">
                      {new Date(flight.date).toLocaleDateString("fr-FR", {
                        weekday: "long", year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(flight.id)}
                    className="text-red-400 hover:text-red-300 text-xs transition"
                  >
                    Supprimer
                  </button>
                </div>

                <div className="flex flex-wrap gap-3 text-sm mb-3">
                  {flight.duration_minutes && (
                    <span className="bg-zinc-800 px-3 py-1 rounded-full text-gray-300">
                      Durée : {formatDuration(flight.duration_minutes)}
                    </span>
                  )}
                  {flight.elevation_gain && (
                    <span className="bg-zinc-800 px-3 py-1 rounded-full text-gray-300">
                      D+ : {flight.elevation_gain} m
                    </span>
                  )}
                  {flight.rating && (
                    <span className="bg-zinc-800 px-3 py-1 rounded-full text-gray-300">
                      {"⭐".repeat(flight.rating)}
                    </span>
                  )}
                </div>

                {flight.equipment_used && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {flight.equipment_used.split(", ").map((eq) => (
                      <span key={eq} className="bg-green-900 border border-green-700 px-3 py-1 rounded-full text-green-300 text-xs">
                        {eq}
                      </span>
                    ))}
                  </div>
                )}

                {flight.conditions && (
                  <p className="text-gray-400 text-sm mb-2">Conditions : {flight.conditions}</p>
                )}
                {flight.notes && (
                  <p className="text-gray-300 text-sm leading-relaxed">{flight.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
