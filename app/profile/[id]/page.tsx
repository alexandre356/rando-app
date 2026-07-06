"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

type Profile = {
  id: string;
  username: string | null;
  bio: string | null;
  department: string | null;
  country: string | null;
  avatar_url: string | null;
};

type Outing = {
  id: string;
  title: string;
  date: string;
  conditions: string | null;
};

type Summit = {
  id: string;
  name: string;
  massif: string | null;
};

export default function PublicProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [outings, setOutings] = useState<Outing[]>([]);
  const [summits, setSummits] = useState<Summit[]>([]);
  const [stats, setStats] = useState({ flights: 0, outings: 0, summits: 0, suspentes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (!profileData) { setLoading(false); return; }
      setProfile(profileData);

      const [
        { data: outingsData },
        { data: summitsData },
        { count: flightsCount },
        { count: outingsCount },
        { count: summitsCount },
      ] = await Promise.all([
        supabase.from("outings").select("id, title, date, conditions").eq("user_id", id).order("date", { ascending: false }).limit(5),
        supabase.from("summits").select("id, name, massif").eq("user_id", id).eq("status", "approved").limit(6),
        supabase.from("flight_logs").select("*", { count: "exact", head: true }).eq("user_id", id),
        supabase.from("outings").select("*", { count: "exact", head: true }).eq("user_id", id),
        supabase.from("summits").select("*", { count: "exact", head: true }).eq("user_id", id).eq("status", "approved"),
      ]);

      // Suspentes reçues
      const outingIds = (outingsData || []).map((o) => o.id);
      let suspentesCount = 0;
      if (outingIds.length > 0) {
        const { count } = await supabase.from("suspentes").select("*", { count: "exact", head: true }).in("outing_id", outingIds);
        suspentesCount = count || 0;
      }

      setOutings(outingsData || []);
      setSummits(summitsData || []);
      setStats({
        flights: flightsCount || 0,
        outings: outingsCount || 0,
        summits: summitsCount || 0,
        suspentes: suspentesCount,
      });
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  if (loading) return <main className="min-h-screen bg-black text-white"><Navbar /><div className="flex items-center justify-center h-96"><p className="text-gray-400 text-xl">Chargement...</p></div></main>;
  if (!profile) return <main className="min-h-screen bg-black text-white"><Navbar /><div className="flex items-center justify-center h-96"><p className="text-gray-400 text-xl">Pilote introuvable.</p></div></main>;

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="p-10">
        <a href="/communaute" className="text-gray-400 hover:text-green-400 transition mb-8 inline-block">&larr; Retour</a>

        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-zinc-700 border-2 border-green-500 flex items-center justify-center overflow-hidden shrink-0">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-4xl">🪂</span>
            }
          </div>
          <div>
            <h1 className="text-4xl font-bold">{profile.username || "Pilote anonyme"}</h1>
            {(profile.department || profile.country) && (
              <p className="text-gray-400 mt-1">{[profile.department, profile.country].filter(Boolean).join(" — ")}</p>
            )}
            {profile.bio && <p className="text-gray-300 mt-2 max-w-xl">{profile.bio}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-green-400">{stats.flights}</p>
            <p className="text-gray-400 text-sm mt-1">Vols</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-green-400">{stats.outings}</p>
            <p className="text-gray-400 text-sm mt-1">Sorties</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-green-400">{stats.summits}</p>
            <p className="text-gray-400 text-sm mt-1">Spots ajoutés</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-green-400">{stats.suspentes}</p>
            <p className="text-gray-400 text-sm mt-1">Suspentes 🪂</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {outings.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Dernières sorties</h2>
              <div className="space-y-3">
                {outings.map((o) => (
                  <div key={o.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                    <p className="font-semibold">{o.title}</p>
                    <p className="text-gray-400 text-sm">{new Date(o.date).toLocaleDateString("fr-FR")}</p>
                    {o.conditions && <p className="text-gray-500 text-xs mt-1">{o.conditions}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {summits.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Spots ajoutés</h2>
              <div className="grid grid-cols-2 gap-3">
                {summits.map((s) => (
                  <Link key={s.id} href={`/summit/${s.id}`} className="bg-zinc-900 border border-zinc-800 hover:border-green-500 transition rounded-2xl p-4">
                    <p className="font-semibold text-sm">{s.name}</p>
                    <p className="text-gray-400 text-xs">{s.massif}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
