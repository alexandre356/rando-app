"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";
import Map, { Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

type Summit = {
  id: string;
  name: string;
  massif: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

type Topo = {
  id: string;
  name: string;
  takeoff_name: string | null;
  landing_name: string | null;
  orientation: string | null;
  elevation_gain: number | null;
  min_glide_ratio: number | null;
  approach_type: string | null;
  approach_notes: string | null;
  danger: string | null;
  start_name: string | null;
};

export default function SummitPage() {
  const { id } = useParams();
  const [summit, setSummit] = useState<Summit | null>(null);
  const [topos, setTopos] = useState<Topo[]>([]);
  const [loading, setLoading] = useState(true);
  const [outingCount, setOutingCount] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: summitData } = await supabase.from("summits").select("*").eq("id", id).single();
      setSummit(summitData);

      const { data: toposData } = await supabase
        .from("topos")
        .select("*")
        .eq("summit_id", id)
        .eq("status", "approved")
        .order("created_at");
      setTopos(toposData || []);

      const { count } = await supabase
        .from("outings")
        .select("*", { count: "exact", head: true })
        .eq("summit_id", id);
      setOutingCount(count || 0);

      setLoading(false);
    }
    if (id) load();
  }, [id]);

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

  if (!summit) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-400 text-xl">Sommet introuvable.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="p-10">
        <a href="/map" className="text-gray-400 hover:text-green-400 transition mb-8 inline-block">
          &larr; Retour à la carte
        </a>

        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-5xl font-bold mb-1">{summit.name}</h1>
            <p className="text-green-400 text-lg">{summit.massif}</p>
          </div>
          <a href={`/submit-topo/${summit.id}`} className="bg-green-500 hover:bg-green-600 transition px-5 py-3 rounded-xl font-semibold text-sm shrink-0">
            + Ajouter un topo
          </a>
        </div>

        <p className="text-teal-400 italic text-sm mb-8">&ldquo;Quand ça bip très fort, souris et fais semblant de comprendre.&rdquo;</p>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-green-400">{topos.length}</p>
            <p className="text-gray-400 text-sm mt-1">Topo(s)</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-green-400">{outingCount}</p>
            <p className="text-gray-400 text-sm mt-1">Sortie(s) communauté</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-3xl font-bold text-green-400">{new Date(summit.created_at).toLocaleDateString("fr-FR")}</p>
            <p className="text-gray-400 text-sm mt-1">Ajouté le</p>
          </div>
        </div>

        {summit.description && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-3">Description</h2>
            <p className="text-gray-300 leading-relaxed">{summit.description}</p>
          </div>
        )}

        {summit.latitude && summit.longitude && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-3">Localisation</h2>
            <div className="w-full h-72 rounded-2xl overflow-hidden border border-zinc-800">
              <Map
                initialViewState={{ longitude: summit.longitude, latitude: summit.latitude, zoom: 11 }}
                mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                mapStyle="mapbox://styles/mapbox/outdoors-v12"
                style={{ width: "100%", height: "100%" }}
              >
                <Marker longitude={summit.longitude} latitude={summit.latitude} anchor="center">
                  <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-lg" />
                </Marker>
              </Map>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Topos ({topos.length})</h2>
          {topos.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
              <p className="text-gray-400 mb-4">Aucun topo pour ce sommet.</p>
              <a href={`/submit-topo/${summit.id}`} className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold">
                Ajouter le premier topo
              </a>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {topos.map((topo) => (
                <a key={topo.id} href={`/topo/${topo.id}`} className="block bg-zinc-900 border border-zinc-800 hover:border-green-500 transition rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold">{topo.name}</h3>
                    {topo.approach_type && (
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${topo.approach_type === "Alpinisme" ? "bg-orange-500 text-white" : "bg-green-500 text-white"}`}>
                        {topo.approach_type}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm text-gray-400 mb-2">
                    {topo.elevation_gain && <span>D+ : {topo.elevation_gain} m</span>}
                    {topo.orientation && <span>Orient. : {topo.orientation}</span>}
                    {topo.min_glide_ratio && <span>Finesse : {topo.min_glide_ratio}</span>}
                  </div>
                  {topo.start_name && <p className="text-gray-500 text-xs">Départ : {topo.start_name}</p>}
                  <p className="text-green-400 text-xs mt-2">Voir le topo &rarr;</p>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <a href={`/communaute?summit=${summit.id}`} className="bg-zinc-900 border border-zinc-800 hover:border-green-500 transition px-6 py-3 rounded-xl font-semibold text-sm">
            Voir les sorties communauté
          </a>
        </div>
      </section>
    </main>
  );
}
