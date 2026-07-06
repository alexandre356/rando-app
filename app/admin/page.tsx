"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";

const ADMIN_UID = "8dda6bc2-0ddc-42f5-949f-0c28fa4c6635";

type Summit = {
  id: string;
  name: string;
  massif: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  status: string;
  created_at: string;
};

type Topo = {
  id: string;
  name: string;
  summit_id: string;
  approach_type: string | null;
  elevation_gain: number | null;
  status: string;
  created_at: string;
  summits?: { name: string } | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [pendingSummits, setPendingSummits] = useState<Summit[]>([]);
  const [pendingTopos, setPendingTopos] = useState<Topo[]>([]);
  const [reports, setReports] = useState<Array<{id: string; reason: string; created_at: string; topo_id: string; topos?: {name: string} | null}>>([]);
  const [globalStats, setGlobalStats] = useState({ users: 0, flights: 0, outings: 0, summits: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== ADMIN_UID) { router.push("/"); return; }

      const { data: summits } = await supabase
        .from("summits")
        .select("*")
        .eq("status", "pending")
        .order("created_at");

      const { data: topos } = await supabase
        .from("topos")
        .select("*, summits(name)")
        .eq("status", "pending")
        .order("created_at");

      setPendingSummits(summits || []);
      setPendingTopos(topos || []);

      // Reports
      const { data: reportsData } = await supabase
        .from("reports")
        .select("*, topos(name)")
        .order("created_at", { ascending: false });
      setReports(reportsData || []);

      // Global stats
      const [{ count: usersCount }, { count: flightsCount }, { count: outingsCount }, { count: summitsCount }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("flight_logs").select("*", { count: "exact", head: true }),
        supabase.from("outings").select("*", { count: "exact", head: true }),
        supabase.from("summits").select("*", { count: "exact", head: true }).eq("status", "approved"),
      ]);
      setGlobalStats({ users: usersCount || 0, flights: flightsCount || 0, outings: outingsCount || 0, summits: summitsCount || 0 });

      setLoading(false);
    }
    load();
  }, []);

  async function approveSummit(id: string) {
    await supabase.from("summits").update({ status: "approved" }).eq("id", id);
    setPendingSummits(pendingSummits.filter((s) => s.id !== id));
  }

  async function rejectSummit(id: string) {
    await supabase.from("summits").delete().eq("id", id);
    setPendingSummits(pendingSummits.filter((s) => s.id !== id));
  }

  async function approveTopo(id: string) {
    await supabase.from("topos").update({ status: "approved" }).eq("id", id);
    setPendingTopos(pendingTopos.filter((t) => t.id !== id));
  }

  async function rejectTopo(id: string) {
    await supabase.from("topos").delete().eq("id", id);
    setPendingTopos(pendingTopos.filter((t) => t.id !== id));
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
        <h1 className="text-5xl font-bold mb-2">Administration</h1>
        <p className="text-teal-400 italic text-sm mb-8">&ldquo;Quand ça bip très fort, souris.&rdquo;</p>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-orange-400">{pendingSummits.length}</p>
            <p className="text-gray-400 text-sm mt-1">Sommet(s) en attente</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-orange-400">{pendingTopos.length}</p>
            <p className="text-gray-400 text-sm mt-1">Topo(s) en attente</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4">Sommets en attente</h2>
        {pendingSummits.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8 text-center">
            <p className="text-gray-400">Aucun sommet en attente</p>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {pendingSummits.map((summit) => (
              <div key={summit.id} className="bg-zinc-900 border border-orange-500 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold">{summit.name}</h3>
                    <p className="text-gray-400 text-sm">{summit.massif}</p>
                    {summit.description && <p className="text-gray-300 text-sm mt-2">{summit.description}</p>}
                    <p className="text-gray-500 text-xs mt-1">
                      {summit.latitude?.toFixed(4)}, {summit.longitude?.toFixed(4)}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => approveSummit(summit.id)} className="bg-green-500 hover:bg-green-600 transition px-4 py-2 rounded-xl font-semibold text-sm">
                      Valider
                    </button>
                    <button onClick={() => rejectSummit(summit.id)} className="bg-red-600 hover:bg-red-700 transition px-4 py-2 rounded-xl font-semibold text-sm">
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats globales */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-green-400">{globalStats.users}</p>
            <p className="text-gray-400 text-sm mt-1">Membres</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-green-400">{globalStats.summits}</p>
            <p className="text-gray-400 text-sm mt-1">Spots validés</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-green-400">{globalStats.flights}</p>
            <p className="text-gray-400 text-sm mt-1">Vols enregistrés</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-green-400">{globalStats.outings}</p>
            <p className="text-gray-400 text-sm mt-1">Sorties partagées</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4">Topos en attente</h2>
        {pendingTopos.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-gray-400">Aucun topo en attente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingTopos.map((topo) => (
              <div key={topo.id} className="bg-zinc-900 border border-orange-500 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold">{topo.name}</h3>
                    <p className="text-green-400 text-sm">Sommet : {topo.summits?.name}</p>
                    <div className="flex gap-4 text-sm text-gray-400 mt-2">
                      {topo.approach_type && <span className={`px-2 py-1 rounded-full text-xs font-semibold ${topo.approach_type === "Alpinisme" ? "bg-orange-900 text-orange-300" : "bg-green-900 text-green-300"}`}>{topo.approach_type}</span>}
                      {topo.elevation_gain && <span>D+ : {topo.elevation_gain} m</span>}
                    </div>
                    <a href={`/topo/${topo.id}`} className="text-cyan-400 text-xs mt-1 inline-block hover:underline">
                      Voir le topo complet
                    </a>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => approveTopo(topo.id)} className="bg-green-500 hover:bg-green-600 transition px-4 py-2 rounded-xl font-semibold text-sm">
                      Valider
                    </button>
                    <button onClick={() => rejectTopo(topo.id)} className="bg-red-600 hover:bg-red-700 transition px-4 py-2 rounded-xl font-semibold text-sm">
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      {/* Signalements */}
        <h2 className="text-2xl font-bold mb-4 mt-8">Signalements ({reports.length})</h2>
        {reports.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-gray-400">Aucun signalement</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-zinc-900 border border-orange-800 rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-orange-400">{report.topos?.name || "Topo supprimé"}</p>
                    <p className="text-gray-300 mt-1">{report.reason}</p>
                    <p className="text-gray-500 text-xs mt-2">{new Date(report.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <a href={`/topo/${report.topo_id}`} target="_blank" className="text-cyan-400 text-sm hover:underline shrink-0 ml-4">
                    Voir le topo
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
