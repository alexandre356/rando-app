"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";

const departments = [
  "01 - Ain", "02 - Aisne", "03 - Allier", "04 - Alpes-de-Haute-Provence",
  "05 - Hautes-Alpes", "06 - Alpes-Maritimes", "07 - Ardèche", "08 - Ardennes",
  "09 - Ariège", "10 - Aube", "11 - Aude", "12 - Aveyron",
  "13 - Bouches-du-Rhône", "14 - Calvados", "15 - Cantal", "16 - Charente",
  "17 - Charente-Maritime", "18 - Cher", "19 - Corrèze", "2A - Corse-du-Sud",
  "2B - Haute-Corse", "21 - Côte-d'Or", "22 - Côtes-d'Armor", "23 - Creuse",
  "24 - Dordogne", "25 - Doubs", "26 - Drôme", "27 - Eure",
  "28 - Eure-et-Loir", "29 - Finistère", "30 - Gard", "31 - Haute-Garonne",
  "32 - Gers", "33 - Gironde", "34 - Hérault", "35 - Ille-et-Vilaine",
  "36 - Indre", "37 - Indre-et-Loire", "38 - Isère", "39 - Jura",
  "40 - Landes", "41 - Loir-et-Cher", "42 - Loire", "43 - Haute-Loire",
  "44 - Loire-Atlantique", "45 - Loiret", "46 - Lot", "47 - Lot-et-Garonne",
  "48 - Lozère", "49 - Maine-et-Loire", "50 - Manche", "51 - Marne",
  "52 - Haute-Marne", "53 - Mayenne", "54 - Meurthe-et-Moselle", "55 - Meuse",
  "56 - Morbihan", "57 - Moselle", "58 - Nièvre", "59 - Nord",
  "60 - Oise", "61 - Orne", "62 - Pas-de-Calais", "63 - Puy-de-Dôme",
  "64 - Pyrénées-Atlantiques", "65 - Hautes-Pyrénées", "66 - Pyrénées-Orientales",
  "67 - Bas-Rhin", "68 - Haut-Rhin", "69 - Rhône", "70 - Haute-Saône",
  "71 - Saône-et-Loire", "72 - Sarthe", "73 - Savoie", "74 - Haute-Savoie",
  "75 - Paris", "76 - Seine-Maritime", "77 - Seine-et-Marne", "78 - Yvelines",
  "79 - Deux-Sèvres", "80 - Somme", "81 - Tarn", "82 - Tarn-et-Garonne",
  "83 - Var", "84 - Vaucluse", "85 - Vendée", "86 - Vienne",
  "87 - Haute-Vienne", "88 - Vosges", "89 - Yonne", "90 - Territoire de Belfort",
  "91 - Essonne", "92 - Hauts-de-Seine", "93 - Seine-Saint-Denis", "94 - Val-de-Marne",
  "95 - Val-d'Oise", "974 - La Réunion", "972 - Martinique", "971 - Guadeloupe",
];

type Equipment = {
  id: string;
  name: string;
  type: string | null;
  brand: string | null;
  model: string | null;
};

function FlightStatsSection({ userId }: { userId?: string }) {
  const [monthlyData, setMonthlyData] = useState<Array<{month: string; vols: number; deplus: number}>>([]);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      const { data } = await supabase.from("flight_logs").select("date, duration_minutes, elevation_gain").eq("user_id", userId);
      const byMonth: Record<string, { vols: number; deplus: number }> = {};
      for (const f of data || []) {
        if (!f.date) continue;
        const key = f.date.substring(0, 7);
        if (!byMonth[key]) byMonth[key] = { vols: 0, deplus: 0 };
        byMonth[key].vols++;
        byMonth[key].deplus += f.elevation_gain || 0;
      }
      const sorted = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
      setMonthlyData(sorted.map(([month, stats]) => ({
        month: new Date(month + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        vols: stats.vols,
        deplus: stats.deplus,
      })));
    }
    load();
  }, [userId]);

  if (monthlyData.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-6">Statistiques de vol</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-300">Vols par mois</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="volsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }} labelStyle={{ color: "#9ca3af" }} itemStyle={{ color: "#22c55e" }} formatter={(value) => [`${value}`, "Vols"]} />
              <Area type="monotone" dataKey="vols" stroke="#22c55e" strokeWidth={2.5} fill="url(#volsGradient)" dot={{ fill: "#22c55e", r: 4, strokeWidth: 2, stroke: "#000" }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-300">D+ cumulé par mois (m)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="deplusGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }} labelStyle={{ color: "#9ca3af" }} itemStyle={{ color: "#06b6d4" }} formatter={(value) => [`${value} m`, "D+"]} />
              <Area type="monotone" dataKey="deplus" stroke="#06b6d4" strokeWidth={2.5} fill="url(#deplusGradient)" dot={{ fill: "#06b6d4", r: 4, strokeWidth: 2, stroke: "#000" }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{id: string} | null>(null);
  const [newSuspentes, setNewSuspentes] = useState(0);
  const [newComments, setNewComments] = useState(0);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [department, setDepartment] = useState("");
  const [flightsCount, setFlightsCount] = useState("");
  const [country, setCountry] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [sitesCount, setSitesCount] = useState(0);
  const [outingsCount, setOutingsCount] = useState(0);
  const [topicsCount, setTopicsCount] = useState(0);
  const [flightLogsCount, setFlightLogsCount] = useState(0);

  const [voiles, setVoiles] = useState<Equipment[]>([]);
  const [sellettes, setSellettes] = useState<Equipment[]>([]);
  const [autresMatos, setAutresMatos] = useState<Equipment[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setDepartment(profile.department || "");
        setFlightsCount(profile.flights_count?.toString() || "");
        setCountry(profile.country || "");
        setAvatarUrl(profile.avatar_url || null);
      }

      const { count: sites } = await supabase
        .from("summits").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      const { count: outings } = await supabase
        .from("outings").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      const { count: topics } = await supabase
        .from("forum_topics").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      const { count: flightLogs } = await supabase
        .from("flight_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id);

      setSitesCount(sites || 0);
      setOutingsCount(outings || 0);
      setTopicsCount(topics || 0);
      setFlightLogsCount(flightLogs || 0);

      const { data: equipmentData } = await supabase
        .from("equipment")
        .select("id, name, type, brand, model")
        .eq("user_id", user.id)
        .order("created_at");

      const allEquipment = equipmentData || [];
      setVoiles(allEquipment.filter((e) => e.type === "Voile"));
      setSellettes(allEquipment.filter((e) => e.type === "Sellette"));
      setAutresMatos(allEquipment.filter((e) => e.type !== "Voile" && e.type !== "Sellette"));

      // Notifications depuis la dernière visite
      const lastSeen = profile?.last_seen_at ? new Date(profile.last_seen_at) : new Date(0);

      // Nouvelles suspentes sur mes sorties
      const { data: myOutings } = await supabase
        .from("outings")
        .select("id")
        .eq("user_id", user.id);

      if (myOutings && myOutings.length > 0) {
        const myOutingIds = myOutings.map((o) => o.id);
        const { count: newSuspentesCount } = await supabase
          .from("suspentes")
          .select("*", { count: "exact", head: true })
          .in("outing_id", myOutingIds)
          .neq("user_id", user.id)
          .gt("created_at", lastSeen.toISOString());
        setNewSuspentes(newSuspentesCount || 0);

        // Nouveaux commentaires sur mes sorties
        const { count: newCommentsCount } = await supabase
          .from("outing_comments")
          .select("*", { count: "exact", head: true })
          .in("outing_id", myOutingIds)
          .neq("user_id", user.id)
          .gt("created_at", lastSeen.toISOString());
        setNewComments(newCommentsCount || 0);
      }

      // Mettre à jour last_seen_at
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id);

      setLoading(false);
    }
    load();
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fileName = `${user.id}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars").upload(fileName, file, { upsert: true });

    if (uploadError) { alert(uploadError.message); setAvatarUploading(false); return; }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
    setAvatarUrl(urlData.publicUrl);
    setAvatarUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").update({
      username,
      bio,
      department,
      flights_count: flightsCount ? Number(flightsCount) : 0,
      country: country || null,
    }).eq("id", user.id);

    if (error) { alert(error.message); setSaving(false); return; }
    alert("Profil mis à jour !");
    setSaving(false);
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

      <section className="p-5 sm:p-10">
        <h1 className="text-3xl sm:text-5xl font-bold mb-2">Mon profil</h1>
        <p className="text-amber-400 italic text-sm mb-4">&ldquo;Le relief est là pour te rappeler ta finesse réelle.&rdquo;</p>

        {(newSuspentes > 0 || newComments > 0) && (
          <div className="flex flex-wrap gap-3 mb-6">
            {newSuspentes > 0 && (
              <a href="/communaute" className="flex items-center gap-2 bg-green-950 border border-green-600 rounded-xl px-4 py-3 hover:border-green-400 transition">
                <span className="text-lg">🪂</span>
                <div>
                  <p className="text-green-400 font-bold text-sm">{newSuspentes} nouvelle{newSuspentes > 1 ? "s" : ""} suspente{newSuspentes > 1 ? "s" : ""} !</p>
                  <p className="text-gray-400 text-xs">Depuis ta dernière visite</p>
                </div>
              </a>
            )}
            {newComments > 0 && (
              <a href="/communaute" className="flex items-center gap-2 bg-blue-950 border border-blue-600 rounded-xl px-4 py-3 hover:border-blue-400 transition">
                <span className="text-lg">💬</span>
                <div>
                  <p className="text-blue-400 font-bold text-sm">{newComments} nouveau{newComments > 1 ? "x" : ""} commentaire{newComments > 1 ? "s" : ""} !</p>
                  <p className="text-gray-400 text-xs">Sur tes sorties</p>
                </div>
              </a>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8 mb-8">

          <form onSubmit={handleSave} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
            <h2 className="text-xl font-bold mb-2">Informations personnelles</h2>

            <div className="flex items-center gap-6">
              <div>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-green-500" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-zinc-700 border-2 border-zinc-600 flex items-center justify-center text-3xl">
                    🪂
                  </div>
                )}
              </div>
              <div>
                <p className="text-gray-300 text-sm mb-2">Photo de profil</p>
                <label className="cursor-pointer inline-block bg-black border border-zinc-700 hover:border-green-500 transition rounded-xl px-4 py-2 text-sm font-semibold text-gray-300">
                  {avatarUploading ? "Upload..." : "Changer la photo"}
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={avatarUploading} />
                </label>
              </div>
            </div>

            <input
              type="text"
              placeholder="Pseudo"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            />

            <textarea
              placeholder="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            />

            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            >
              <option value="">Département</option>
              {departments.map((dep) => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Pays (ex: France, Suisse, Italie...)"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            />

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-500 hover:bg-green-600 transition px-8 py-4 rounded-xl font-semibold text-lg disabled:opacity-50"
            >
              {saving ? "Sauvegarde..." : "Sauvegarder le profil"}
            </button>
          </form>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Mes voiles</h2>
                <a href="/profile/equipment" className="text-green-400 text-sm hover:underline">
                  Gérer le matériel
                </a>
              </div>
              {voiles.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune voile enregistrée.</p>
              ) : (
                <div className="space-y-3">
                  {voiles.map((v) => (
                    <div key={v.id} className="bg-black border border-zinc-700 rounded-xl px-4 py-3">
                      <p className="font-semibold">{v.name}</p>
                      {(v.brand || v.model) && (
                        <p className="text-gray-400 text-sm">{[v.brand, v.model].filter(Boolean).join(" — ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Mes sellettes</h2>
                <a href="/profile/equipment" className="text-green-400 text-sm hover:underline">
                  Gérer le matériel
                </a>
              </div>
              {sellettes.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune sellette enregistrée.</p>
              ) : (
                <div className="space-y-3">
                  {sellettes.map((s) => (
                    <div key={s.id} className="bg-black border border-zinc-700 rounded-xl px-4 py-3">
                      <p className="font-semibold">{s.name}</p>
                      {(s.brand || s.model) && (
                        <p className="text-gray-400 text-sm">{[s.brand, s.model].filter(Boolean).join(" — ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {autresMatos.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                <h2 className="text-xl font-bold mb-4">Autre matériel</h2>
                <div className="space-y-3">
                  {autresMatos.map((m) => (
                    <div key={m.id} className="bg-black border border-zinc-700 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{m.name}</p>
                        {m.type && <span className="text-xs bg-zinc-700 px-2 py-1 rounded-full text-gray-400">{m.type}</span>}
                      </div>
                      {(m.brand || m.model) && (
                        <p className="text-gray-400 text-sm">{[m.brand, m.model].filter(Boolean).join(" — ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats graphiques vols par mois */}
        <FlightStatsSection userId={user?.id} />

        {/* Stats globales — en bas de page */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-green-400">{sitesCount}</p>
            <p className="text-gray-400 text-sm mt-1">Spot(s) ajouté(s)</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-green-400">{outingsCount}</p>
            <p className="text-gray-400 text-sm mt-1">Sortie(s)</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-green-400">{topicsCount}</p>
            <p className="text-gray-400 text-sm mt-1">Discussion(s)</p>
          </div>
          <a href="/profile/flights" className="bg-zinc-900 border border-zinc-800 hover:border-green-500 transition rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-green-400">{flightLogsCount}</p>
            <p className="text-gray-400 text-sm mt-1">Vol(s) enregistré(s)</p>
            <p className="text-green-400 text-xs mt-2">Voir le journal</p>
          </a>
        </div>

      </section>
    </main>
  );
}
