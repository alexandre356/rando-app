"use client";

import { useEffect, useState } from "react";
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

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [wing, setWing] = useState("");
  const [harness, setHarness] = useState("");
  const [department, setDepartment] = useState("");
  const [flightsCount, setFlightsCount] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [sitesCount, setSitesCount] = useState(0);
  const [outingsCount, setOutingsCount] = useState(0);
  const [topicsCount, setTopicsCount] = useState(0);
  const [flightLogsCount, setFlightLogsCount] = useState(0);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setWing(profile.wing || "");
        setHarness(profile.harness || "");
        setDepartment(profile.department || "");
        setFlightsCount(profile.flights_count?.toString() || "");
        setAvatarUrl(profile.avatar_url || null);
      }

      const { count: sites } = await supabase
        .from("sites")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: outings } = await supabase
        .from("outings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: topics } = await supabase
        .from("forum_topics")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: flightLogs } = await supabase
        .from("flight_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setSitesCount(sites || 0);
      setOutingsCount(outings || 0);
      setTopicsCount(topics || 0);
      setFlightLogsCount(flightLogs || 0);

      setLoading(false);
    }

    load();
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const fileName = `${user.id}-${Date.now()}.${file.name.split(".").pop()}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      alert(uploadError.message);
      setAvatarUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    await supabase
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", user.id);

    setAvatarUrl(urlData.publicUrl);
    setAvatarUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        username,
        bio,
        wing,
        harness,
        department,
        flights_count: flightsCount ? Number(flightsCount) : 0,
      })
      .eq("id", user.id);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

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

      <section className="max-w-4xl mx-auto p-10">
        <h1 className="text-5xl font-bold mb-4">Mon profil</h1>
        <p className="text-amber-400 italic text-sm mb-8">&ldquo;Le relief est là pour te rappeler ta finesse réelle.&rdquo;</p>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-green-400">{sitesCount}</p>
            <p className="text-gray-400 text-sm mt-1">Site(s) soumis</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-green-400">{outingsCount}</p>
            <p className="text-gray-400 text-sm mt-1">Sortie(s)</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-green-400">{topicsCount}</p>
            <p className="text-gray-400 text-sm mt-1">Discussion(s)</p>
          </div>
          <a
            href="/profile/flights"
            className="bg-zinc-900 border border-zinc-800 hover:border-green-500 transition rounded-2xl p-6 text-center"
          >
            <p className="text-3xl font-bold text-green-400">{flightLogsCount}</p>
            <p className="text-gray-400 text-sm mt-1">Vol(s) enregistré(s)</p>
            <p className="text-green-400 text-xs mt-2">Voir le journal</p>
          </a>
        </div>

        <form
          onSubmit={handleSave}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6"
        >
          <div className="flex items-center gap-6 mb-4">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-2 border-green-500"
                />
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
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={avatarUploading}
                />
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
              <option key={dep} value={dep}>
                {dep}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Voile (ex: Ozone Rush 6, Nova Mentor 7...)"
            value={wing}
            onChange={(e) => setWing(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <input
            type="text"
            placeholder="Sellette (ex: Kortel Kolibri, Advance Lightness...)"
            value={harness}
            onChange={(e) => setHarness(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <input
            type="number"
            placeholder="Nombre de vols total"
            value={flightsCount}
            onChange={(e) => setFlightsCount(e.target.value)}
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
      </section>
    </main>
  );
}
