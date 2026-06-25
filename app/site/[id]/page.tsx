"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

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
  created_at: string;
};

type GeoJsonLine = {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: number[][];
  };
  properties: Record<string, unknown>;
};

function parseGpx(gpxText: string): number[][] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(gpxText, "application/xml");
  const trkpts = xml.getElementsByTagName("trkpt");
  const coords: number[][] = [];
  for (let i = 0; i < trkpts.length; i++) {
    const lat = parseFloat(trkpts[i].getAttribute("lat") || "0");
    const lon = parseFloat(trkpts[i].getAttribute("lon") || "0");
    if (!isNaN(lat) && !isNaN(lon)) {
      coords.push([lon, lat]);
    }
  }
  return coords;
}

export default function SitePage() {
  const { id } = useParams();
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [gpxUrl, setGpxUrl] = useState<string | null>(null);
  const [gpxName, setGpxName] = useState<string | null>(null);
  const [gpxLine, setGpxLine] = useState<GeoJsonLine | null>(null);

  useEffect(() => {
    async function loadSite() {
      const { data, error } = await supabase
        .from("sites")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error(error);
      } else {
        setSite(data);
      }

      setLoading(false);
    }

    async function loadPhotos() {
      const { data, error } = await supabase.storage
        .from("sites")
        .list(String(id), { sortBy: { column: "created_at", order: "asc" } });

      if (error || !data) return;

      const urls = data.map((file) => {
        const { data: urlData } = supabase.storage
          .from("sites")
          .getPublicUrl(`${id}/${file.name}`);
        return urlData.publicUrl;
      });

      setPhotos(urls);
    }

    async function loadGpx() {
      const { data, error } = await supabase.storage
        .from("gpx")
        .list(String(id), { sortBy: { column: "created_at", order: "asc" } });

      if (error || !data || data.length === 0) return;

      const file = data[0];
      const { data: urlData } = supabase.storage
        .from("gpx")
        .getPublicUrl(`${id}/${file.name}`);

      setGpxUrl(urlData.publicUrl);
      setGpxName(file.name);

      try {
        const response = await fetch(urlData.publicUrl);
        const text = await response.text();
        const coords = parseGpx(text);

        if (coords.length > 0) {
          setGpxLine({
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: coords,
            },
            properties: {},
          });
        }
      } catch (e) {
        console.error("Erreur parsing GPX", e);
      }
    }

    if (id) {
      loadSite();
      loadPhotos();
      loadGpx();
    }
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

  if (!site) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-400 text-xl">Site introuvable.</p>
        </div>
      </main>
    );
  }

  const orientations = site.orientation ? site.orientation.split(",") : [];

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="max-w-4xl mx-auto p-10">

        <a
          href="/map"
          className="text-gray-400 hover:text-green-400 transition mb-8 inline-block"
        >
          &larr; Retour à la carte
        </a>

        <h1 className="text-5xl font-bold mb-2">{site.name}</h1>
        <p className="text-teal-400 italic text-sm mb-2">&ldquo;Quand ça bip très fort, souris et fais semblant de comprendre.&rdquo;</p>
        <p className="text-green-400 text-lg mb-8">{site.massif}</p>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Dénivelé +</p>
            <p className="text-3xl font-bold">
              {site.elevation_gain ?? "?"}{" "}
              <span className="text-lg font-normal text-gray-400">m</span>
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Finesse minimale</p>
            <p className="text-3xl font-bold">
              {site.min_glide_ratio ?? "?"}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Orientations</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {orientations.length > 0 ? (
                orientations.map((o) => (
                  <span
                    key={o}
                    className="bg-green-500 text-white text-sm px-3 py-1 rounded-full font-semibold"
                  >
                    {o}
                  </span>
                ))
              ) : (
                <p className="text-gray-400">Non renseignée</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Décollage</p>
            <p className="text-xl font-semibold">
              {site.takeoff_name || "Non renseigné"}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Atterrissage</p>
            <p className="text-xl font-semibold">
              {site.landing_name || "Non renseigné"}
            </p>
          </div>
        </div>

        {site.description && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-3">Description</h2>
            <p className="text-gray-300 leading-relaxed">{site.description}</p>
          </div>
        )}

        {site.danger && (
          <div className="bg-red-950 border border-red-800 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-3 text-red-400">
              Dangers et remarques
            </h2>
            <p className="text-red-200 leading-relaxed">{site.danger}</p>
          </div>
        )}

        {photos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Photos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-48 object-cover rounded-2xl border border-zinc-800"
                />
              ))}
            </div>
          </div>
        )}

        {gpxUrl && (
          <div className="mb-4">
            <a
              href={gpxUrl}
              download={gpxName || "trace.gpx"}
              className="inline-flex items-center gap-3 bg-zinc-900 border border-zinc-700 hover:border-green-500 transition rounded-xl px-6 py-4 font-semibold"
            >
              Télécharger la trace GPX
            </a>
          </div>
        )}

        {site.latitude && site.longitude && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-3">Localisation</h2>
            <div className="w-full h-96 rounded-2xl overflow-hidden border border-zinc-800">
              <Map
                initialViewState={{
                  longitude: site.longitude,
                  latitude: site.latitude,
                  zoom: 12,
                }}
                mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                mapStyle="mapbox://styles/mapbox/outdoors-v12"
                style={{ width: "100%", height: "100%" }}
              >
                <Marker
                  longitude={site.longitude}
                  latitude={site.latitude}
                  anchor="bottom"
                >
                  <span className="text-3xl">📍</span>
                </Marker>

                {gpxLine && (
                  <Source id="gpx-trace" type="geojson" data={gpxLine}>
                    <Layer
                      id="gpx-line"
                      type="line"
                      paint={{
                        "line-color": "#22c55e",
                        "line-width": 3,
                        "line-opacity": 0.9,
                      }}
                    />
                  </Source>
                )}
              </Map>
            </div>
          </div>
        )}

        <p className="text-gray-600 text-sm">
          Ajouté le{" "}
          {new Date(site.created_at).toLocaleDateString("fr-FR")}
        </p>

      </section>
    </main>
  );
}
