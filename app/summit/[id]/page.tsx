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

      setLoading(false);
    }
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#E4E4E4] text-[#1C0F12]">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <p className="text-[#6F7E86] text-xl">Chargement...</p>
        </div>
      </main>
    );
  }

  if (!summit) {
    return (
      <main className="min-h-screen bg-[#E4E4E4] text-[#1C0F12]">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <p className="text-[#6F7E86] text-xl">Sommet introuvable.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#E4E4E4] text-[#1C0F12]">
      <Navbar />
      <section className="p-10">
        <a href="/map" className="text-[#6F7E86] hover:text-[#1C0F12] transition mb-8 inline-block">
          &larr; Retour à la carte
        </a>

        <div className="mb-2">
          <h1 className="text-5xl font-extrabold mb-4">{summit.name}</h1>
          <a href={`/submit-rando?summitId=${summit.id}`} className="block sm:inline-block sm:w-64 text-center bg-[#1C0F12] hover:bg-[#BEBCC8] hover:text-[#1C0F12] text-[#E4E4E4] transition px-6 py-3 rounded-xl font-bold">
            + Ajouter un topo
          </a>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {summit.latitude && summit.longitude && (
            <div>
              <div className="flex items-baseline gap-3 mb-3">
                <h2 className="text-xl font-bold">Localisation</h2>
                <span className="text-[#6F7E86] font-semibold">{summit.massif}</span>
              </div>
              <div className="w-full h-96 lg:h-[32rem] rounded-2xl overflow-hidden border border-[#B9CFD0]">
                <Map
                  initialViewState={{ longitude: summit.longitude, latitude: summit.latitude, zoom: 11 }}
                  mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                  mapStyle="mapbox://styles/mapbox/outdoors-v12"
                  style={{ width: "100%", height: "100%" }}
                >
                  <Marker longitude={summit.longitude} latitude={summit.latitude} anchor="center">
                    <div className="w-5 h-5 bg-[#1C0F12] rounded-full border-2 border-white shadow-lg" />
                  </Marker>
                </Map>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold mb-4">Topos ({topos.length})</h2>
            {topos.length === 0 ? (
              <div className="bg-white border border-[#B9CFD0] rounded-2xl p-10 text-center">
                <p className="text-[#6F7E86] mb-4">Aucun topo pour ce sommet.</p>
                <a href={`/submit-rando?summitId=${summit.id}`} className="inline-block sm:w-64 text-center bg-[#1C0F12] hover:bg-[#BEBCC8] hover:text-[#1C0F12] text-[#E4E4E4] transition px-6 py-3 rounded-xl font-bold">
                  Ajouter le premier topo
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {topos.map((topo) => (
                  <a key={topo.id} href={`/topo/${topo.id}`} className="block bg-white border border-[#B9CFD0] hover:border-[#1C0F12] transition rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold">{topo.name}</h3>
                      {topo.approach_type && (
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${topo.approach_type === "Alpinisme" ? "bg-[#6F7E86] text-white" : "bg-[#1C0F12] text-[#E4E4E4]"}`}>
                          {topo.approach_type}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-[#6F7E86] mb-2">
                      {topo.elevation_gain && <span>D+ : {topo.elevation_gain} m</span>}
                      {topo.orientation && <span>Orient. : {topo.orientation}</span>}
                      {topo.min_glide_ratio && <span>Finesse : {topo.min_glide_ratio}</span>}
                    </div>
                    {topo.start_name && <p className="text-[#6F7E86] text-xs">Départ : {topo.start_name}</p>}
                    <p className="text-[#1C0F12] font-bold text-xs mt-2">Voir le topo &rarr;</p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {summit.description && (
          <div className="bg-white border border-[#B9CFD0] rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-3">Description</h2>
            <p className="text-[#1C0F12]/80 leading-relaxed">{summit.description}</p>
          </div>
        )}

        <div className="flex justify-between items-center">
          <a href={`/communaute?summit=${summit.id}`} className="bg-white border border-[#B9CFD0] hover:border-[#1C0F12] transition px-6 py-3 rounded-xl font-bold text-sm">
            Voir les sorties communauté
          </a>
        </div>
      </section>
    </main>
  );
}
