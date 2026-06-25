"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";

const ADMIN_ID = "8dda6bc2-0ddc-42f5-949f-0c28fa4c6635";

type Site = {
  id: string;
  name: string;
  massif: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  takeoff_name: string | null;
  landing_name: string | null;
  orientation: string | null;
  min_glide_ratio: number | null;
  elevation_gain: number | null;
  danger: string | null;
  status: string | null;
  created_at: string;
};

export default function AdminPage() {
  const router = useRouter();

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdminAndLoad() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.id !== ADMIN_ID) {
        router.push("/");
        return;
      }

      const { data, error } = await supabase
        .from("sites")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
      } else {
        setSites(data || []);
      }

      setLoading(false);
    }

    checkAdminAndLoad();
  }, [router]);

  async function approveSite(id: string) {
    const { error } = await supabase
      .from("sites")
      .update({ status: "approved" })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setSites((currentSites) =>
      currentSites.filter((site) => site.id !== id)
    );
  }

  async function rejectSite(id: string) {
    const { error } = await supabase
      .from("sites")
      .update({ status: "rejected" })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setSites((currentSites) =>
      currentSites.filter((site) => site.id !== id)
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <p className="text-green-400 text-xl">Chargement...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="max-w-4xl mx-auto p-10">
        <h1 className="text-5xl font-bold mb-2">Panel Admin</h1>

        <p className="text-gray-400 mb-8">
          {sites.length} site(s) en attente de validation
        </p>

        {sites.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-xl">Aucun site en attente</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sites.map((site) => (
              <div
                key={site.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">{site.name}</h2>
                    <p className="text-green-400">
                      {site.massif || "Massif non renseigné"}
                    </p>
                  </div>

                  <span className="bg-yellow-500 text-black text-sm px-3 py-1 rounded-full font-semibold">
                    En attente
                  </span>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4 text-sm text-gray-400">
                  <p>D+ : {site.elevation_gain ?? "?"} m</p>
                  <p>Orientation : {site.orientation || "?"}</p>
                  <p>Finesse : {site.min_glide_ratio ?? "?"}</p>
                  <p>Décollage : {site.takeoff_name || "?"}</p>
                  <p>Atterrissage : {site.landing_name || "?"}</p>
                  <p>
                    GPS : {site.latitude ?? "?"}, {site.longitude ?? "?"}
                  </p>
                </div>

                {site.description && (
                  <p className="text-gray-300 text-sm mb-4 border-t border-zinc-800 pt-4">
                    {site.description}
                  </p>
                )}

                {site.danger && (
                  <p className="text-red-400 text-sm mb-4">
                    Danger : {site.danger}
                  </p>
                )}

                <p className="text-gray-600 text-xs mb-4">
                  Soumis le{" "}
                  {new Date(site.created_at).toLocaleDateString("fr-FR")}
                </p>

                <div className="flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={() => approveSite(site.id)}
                    className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold"
                  >
                    Approuver
                  </button>

                  <button
                    type="button"
                    onClick={() => rejectSite(site.id)}
                    className="bg-red-600 hover:bg-red-700 transition px-6 py-3 rounded-xl font-semibold"
                  >
                    Rejeter
                  </button>

                  <a
                    href={`/site/${site.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-zinc-700 hover:bg-zinc-600 transition px-6 py-3 rounded-xl font-semibold"
                  >
                    Voir la fiche
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