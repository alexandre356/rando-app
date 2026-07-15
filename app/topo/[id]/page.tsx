"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Topo = {
  id: string;
  summit_id: string;
  name: string;
  takeoff_name: string | null;
  landing_name: string | null;
  start_name: string | null;
  start_latitude: number | null;
  start_longitude: number | null;
  orientation: string | null;
  elevation_gain: number | null;
  has_windsock: boolean | null;
  approach_type: string | null;
  approach_notes: string | null;
  danger: string | null;
  created_at: string;
};

type Summit = {
  id: string;
  name: string;
  massif: string | null;
  latitude: number | null;
  longitude: number | null;
};

type GeoJsonLine = {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: number[][] };
  properties: Record<string, unknown>;
};

type ElevationPoint = { distance: number; altitude: number };

function parseGpx(gpxText: string): { coords: number[][]; elevationProfile: ElevationPoint[] } {
  const parser = new DOMParser();
  const xml = parser.parseFromString(gpxText, "application/xml");
  let points = Array.from(xml.getElementsByTagName("trkpt"));
  if (points.length === 0) points = Array.from(xml.getElementsByTagName("rtept"));
  if (points.length === 0) points = Array.from(xml.getElementsByTagName("wpt"));

  const coords: number[][] = [];
  const elevationProfile: ElevationPoint[] = [];
  let totalDistance = 0;
  let lastKnownEle = 0;
  let hasAnyElevation = false;

  for (let i = 0; i < points.length; i++) {
    const lat = parseFloat(points[i].getAttribute("lat") || "0");
    const lon = parseFloat(points[i].getAttribute("lon") || "0");
    const eleEl = points[i].getElementsByTagName("ele")[0];
    const eleRaw = eleEl ? parseFloat(eleEl.textContent || "") : NaN;
    let ele: number;
    if (!isNaN(eleRaw)) { ele = eleRaw; lastKnownEle = eleRaw; hasAnyElevation = true; }
    else { ele = lastKnownEle; }

    if (!isNaN(lat) && !isNaN(lon)) {
      if (i > 0 && coords.length > 0) {
        const prev = coords[coords.length - 1];
        const R = 6371000;
        const dLat = ((lat - prev[1]) * Math.PI) / 180;
        const dLon = ((lon - prev[0]) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((prev[1] * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
        totalDistance += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }
      coords.push([lon, lat]);
      elevationProfile.push({ distance: Math.round(totalDistance / 100) / 10, altitude: Math.round(ele) });
    }
  }
  return { coords, elevationProfile: hasAnyElevation ? elevationProfile : [] };
}

function calculateStats(ep: ElevationPoint[]) {
  if (ep.length === 0) return { totalDistance: 0, elevationGain: 0, minAlt: 0, maxAlt: 0 };
  let elevationGain = 0;
  const alts = ep.map((p) => p.altitude);
  for (let i = 1; i < ep.length; i++) { const diff = ep[i].altitude - ep[i-1].altitude; if (diff > 0) elevationGain += diff; }
  return { totalDistance: ep[ep.length - 1]?.distance || 0, elevationGain: Math.round(elevationGain), minAlt: Math.min(...alts), maxAlt: Math.max(...alts) };
}

function estimateWalkingTime(elevationGain: number | null, approachType: string | null): string {
  if (!elevationGain) return "";
  const mPerHour = approachType === "Alpinisme" ? 200 : 300;
  const totalMinutes = Math.round((elevationGain / mPerHour) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${minutes.toString().padStart(2, "0")}`;
}

export default function TopoPage() {
  const { id } = useParams();
  const [topo, setTopo] = useState<Topo | null>(null);
  const [summit, setSummit] = useState<Summit | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [gpxUrl, setGpxUrl] = useState<string | null>(null);
  const [gpxName, setGpxName] = useState<string | null>(null);
  const [gpxLine, setGpxLine] = useState<GeoJsonLine | null>(null);
  const [gpxStart, setGpxStart] = useState<number[] | null>(null);
  const [elevationProfile, setElevationProfile] = useState<ElevationPoint[]>([]);
  const [gpxStats, setGpxStats] = useState<{ totalDistance: number; elevationGain: number; minAlt: number; maxAlt: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [flightCount, setFlightCount] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [mapLayer, setMapLayer] = useState<"mapbox" | "ign" | "opentopo" | "satellite">("mapbox");

  useEffect(() => {
    async function load() {
      const { data: topoData } = await supabase.from("topos").select("*").eq("id", id).single();
      if (!topoData) { setLoading(false); return; }
      setTopo(topoData);

      const { data: summitData } = await supabase.from("summits").select("*").eq("id", topoData.summit_id).single();
      setSummit(summitData);

      const { data: photoFiles } = await supabase.storage.from("sites").list(String(id), { sortBy: { column: "created_at", order: "asc" } });
      if (photoFiles) {
        setPhotos(photoFiles.map((f) => supabase.storage.from("sites").getPublicUrl(`${id}/${f.name}`).data.publicUrl));
      }

      const { data: gpxFiles } = await supabase.storage.from("gpx").list(String(id), { sortBy: { column: "created_at", order: "asc" } });
      if (gpxFiles && gpxFiles.length > 0) {
        const file = gpxFiles[0];
        const { data: urlData } = supabase.storage.from("gpx").getPublicUrl(`${id}/${file.name}`);
        setGpxUrl(urlData.publicUrl);
        setGpxName(file.name);
        try {
          const res = await fetch(urlData.publicUrl);
          const text = await res.text();
          const { coords, elevationProfile } = parseGpx(text);
          if (coords.length > 0) {
            setGpxLine({ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} });
            setGpxStart(coords[0]);
            setElevationProfile(elevationProfile);
            setGpxStats(calculateStats(elevationProfile));
          }
        } catch (e) { console.error(e); }
      }

      const { data: flightLogs } = await supabase
        .from("flight_logs")
        .select("rating")
        .eq("site_id", id)
        .not("rating", "is", null);

      if (flightLogs && flightLogs.length > 0) {
        const avg = flightLogs.reduce((sum, f) => sum + (f.rating || 0), 0) / flightLogs.length;
        setAvgRating(Math.round(avg * 10) / 10);
        setFlightCount(flightLogs.length);
      }

      setLoading(false);
    }
    if (id) load();
  }, [id]);

  async function submitReport() {
    if (!reportReason.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Connectez-vous pour signaler."); return; }
    await supabase.from("reports").insert({ user_id: user.id, topo_id: id, reason: reportReason });
    setReportSent(true);
    setShowReport(false);
    setReportReason("");
  }

  if (loading) return <main className="min-h-screen bg-black text-white"><Navbar /><div className="flex items-center justify-center h-96"><p className="text-gray-400 text-xl">Chargement...</p></div></main>;
  if (!topo || !summit) return <main className="min-h-screen bg-black text-white"><Navbar /><div className="flex items-center justify-center h-96"><p className="text-gray-400 text-xl">Topo introuvable.</p></div></main>;

  const orientations = topo.orientation ? topo.orientation.split(",") : [];

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="p-5 sm:p-10">
        <a href={`/summit/${summit.id}`} className="text-gray-400 hover:text-green-400 transition mb-8 inline-block">
          &larr; Retour à {summit.name}
        </a>

        <h1 className="text-3xl sm:text-5xl font-bold mb-1">{topo.name}</h1>
        <p className="text-green-400 text-lg mb-1">{summit.name} — {summit.massif}</p>
        <p className="text-teal-400 italic text-sm mb-4">&ldquo;Quand ça bip très fort, souris et fais semblant de comprendre.&rdquo;</p>

        <div className="flex flex-wrap items-center gap-4 mb-8">
          {avgRating && (
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
              <span className="text-yellow-400">{"⭐".repeat(Math.round(avgRating))}</span>
              <span className="text-white font-semibold">{avgRating}/5</span>
              <span className="text-gray-400 text-sm">({flightCount} vol{flightCount > 1 ? "s" : ""})</span>
            </div>
          )}
          <button onClick={() => setShowReport(!showReport)}
            className="text-xs text-gray-500 hover:text-orange-400 transition border border-zinc-800 hover:border-orange-500 rounded-xl px-3 py-2">
            ⚠️ Signaler un problème
          </button>
          {reportSent && <p className="text-green-400 text-xs">Signalement envoyé, merci !</p>}
        </div>

        {showReport && (
          <div className="bg-orange-950 border border-orange-800 rounded-2xl p-5 mb-6">
            <h3 className="text-orange-400 font-bold mb-3">⚠️ Signaler un problème sur ce topo</h3>
            <textarea
              placeholder="Décrivez le problème (informations incorrectes, danger non signalé, topo obsolète...)"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={3}
              className="w-full bg-black border border-orange-700 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:border-orange-500"
            />
            <div className="flex gap-3">
              <button onClick={submitReport} className="bg-orange-500 hover:bg-orange-600 transition px-5 py-2 rounded-xl font-semibold text-sm">
                Envoyer le signalement
              </button>
              <button onClick={() => setShowReport(false)} className="bg-zinc-700 hover:bg-zinc-600 transition px-5 py-2 rounded-xl text-sm">
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Dénivelé +</p>
            <p className="text-3xl font-bold">{topo.elevation_gain ?? "?"} <span className="text-lg font-normal text-gray-400">m</span></p>
            {estimateWalkingTime(topo.elevation_gain, topo.approach_type) && (
              <p className="text-green-400 text-sm mt-1">⏱️ ~{estimateWalkingTime(topo.elevation_gain, topo.approach_type)} de montée</p>
            )}
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Manche à air</p>
            <p className="text-3xl font-bold flex items-center gap-2">
              {topo.has_windsock ? <>🎏 <span className="text-green-400 text-lg">Présente</span></> : <span className="text-gray-500 text-lg">Absente</span>}
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center">
            <p className="text-gray-400 text-sm mb-2">Orientations</p>
            <svg width="160" height="160" viewBox="0 0 200 200">
              {[
                { code: "N",  angle: 0 },
                { code: "NE", angle: 45 },
                { code: "E",  angle: 90 },
                { code: "SE", angle: 135 },
                { code: "S",  angle: 180 },
                { code: "SO", angle: 225 },
                { code: "O",  angle: 270 },
                { code: "NO", angle: 315 },
              ].map((dir) => {
                const cx = 100; const cy = 100;
                const outerR = 78; const innerR = 30; const half = 22;
                const a1 = ((dir.angle - half - 90) * Math.PI) / 180;
                const a2 = ((dir.angle + half - 90) * Math.PI) / 180;
                const x1 = cx + outerR * Math.cos(a1); const y1 = cy + outerR * Math.sin(a1);
                const x2 = cx + outerR * Math.cos(a2); const y2 = cy + outerR * Math.sin(a2);
                const ix1 = cx + innerR * Math.cos(a1); const iy1 = cy + innerR * Math.sin(a1);
                const ix2 = cx + innerR * Math.cos(a2); const iy2 = cy + innerR * Math.sin(a2);
                const path = `M ${ix1} ${iy1} L ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 0 0 ${ix1} ${iy1} Z`;
                const lr = outerR + 16;
                const la = ((dir.angle - 90) * Math.PI) / 180;
                const lx = cx + lr * Math.cos(la); const ly = cy + lr * Math.sin(la);
                const isSelected = orientations.includes(dir.code);
                return (
                  <g key={dir.code}>
                    <path d={path} fill={isSelected ? "#22c55e" : "#27272a"} stroke="#000" strokeWidth={1.5} opacity={isSelected ? 1 : 0.6} />
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight={isSelected ? "bold" : "normal"} fill={isSelected ? "#22c55e" : "#6b7280"}>
                      {dir.code}
                    </text>
                  </g>
                );
              })}
              <circle cx={100} cy={100} r={26} fill="#18181b" stroke="#3f3f46" strokeWidth={1} />
              <text x={100} y={100} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#9ca3af">
                {orientations.length > 0 ? orientations.join(" ") : "?"}
              </text>
            </svg>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Lieu de départ</p>
            <p className="text-xl font-semibold">{topo.start_name || "Non renseigné"}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Décollage</p>
            <p className="text-xl font-semibold">{topo.takeoff_name || "Non renseigné"}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Atterrissage</p>
            <p className="text-xl font-semibold">{topo.landing_name || "Non renseigné"}</p>
          </div>
        </div>

        {topo.approach_type && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-xl font-bold">Approche</h2>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${topo.approach_type === "Alpinisme" ? "bg-orange-500 text-white" : "bg-green-500 text-white"}`}>{topo.approach_type}</span>
            </div>
            {topo.approach_notes && <p className="text-gray-300 leading-relaxed">{topo.approach_notes}</p>}
          </div>
        )}

        {topo.danger && (
          <div className="bg-red-950 border border-red-800 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-3 text-red-400">Dangers et remarques</h2>
            <p className="text-red-200 leading-relaxed">{topo.danger}</p>
          </div>
        )}

        {summit.latitude && summit.longitude && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-3">Localisation</h2>
            <div className="flex gap-2 sm:gap-3 mb-4 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap">
              {(["mapbox", "ign", "opentopo", "satellite"] as const).map((layer) => (
                <button key={layer} onClick={() => setMapLayer(layer)} className={`text-sm font-semibold px-5 py-2 rounded-xl border transition ${mapLayer === layer ? "bg-cyan-500 border-cyan-500 text-white" : "bg-zinc-900 border-zinc-700 text-gray-300 hover:border-cyan-500"}`}>
                  {layer === "mapbox" ? "Mapbox" : layer === "ign" ? "Carte IGN" : layer === "opentopo" ? "OpenTopoMap" : "Satellite"}
                </button>
              ))}
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 h-96 rounded-2xl overflow-hidden border border-zinc-800">
                <Map
                  initialViewState={{ longitude: summit.longitude, latitude: summit.latitude, zoom: 12 }}
                  mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                  mapStyle={mapLayer === "satellite" ? "mapbox://styles/mapbox/satellite-streets-v12" : "mapbox://styles/mapbox/outdoors-v12"}
                  style={{ width: "100%", height: "100%" }}
                >
                  {mapLayer === "ign" && (
                    <Source id="ign-plan" type="raster" tiles={["https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png"]} tileSize={256}>
                      <Layer id="ign-plan-layer" type="raster" paint={{}} beforeId="gpx-line" />
                    </Source>
                  )}
                  {mapLayer === "opentopo" && (
                    <Source id="opentopo" type="raster" tiles={["https://a.tile.opentopomap.org/{z}/{x}/{y}.png", "https://b.tile.opentopomap.org/{z}/{x}/{y}.png"]} tileSize={256}>
                      <Layer id="opentopo-layer" type="raster" paint={{}} beforeId="gpx-line" />
                    </Source>
                  )}
                  <Marker longitude={summit.longitude} latitude={summit.latitude} anchor="bottom">
                    <span className="text-3xl">📍</span>
                  </Marker>
                  {topo.start_latitude && topo.start_longitude && (
                    <Marker longitude={topo.start_longitude} latitude={topo.start_latitude} anchor="center">
                      <div className="w-4 h-4 bg-amber-400 rounded-full border-2 border-white shadow-lg" />
                    </Marker>
                  )}
                  {gpxLine && (
                    <Source id="gpx-trace" type="geojson" data={gpxLine}>
                      <Layer id="gpx-line" type="line" paint={{ "line-color": "#06b6d4", "line-width": 4, "line-opacity": 1 }} />
                    </Source>
                  )}
                  {gpxStart && (
                    <Marker longitude={gpxStart[0]} latitude={gpxStart[1]} anchor="center">
                      <div className="w-4 h-4 bg-cyan-400 rounded-full border-2 border-white shadow-lg" />
                    </Marker>
                  )}
                </Map>
              </div>

              {gpxUrl && (
                <div className="h-96 flex flex-col gap-3">
                  <a href={gpxUrl} download={gpxName || "trace.gpx"} className="flex items-center justify-center bg-zinc-900 border border-zinc-700 hover:border-cyan-500 transition rounded-xl px-4 py-3 font-semibold text-sm shrink-0">
                    Télécharger la trace GPX
                  </a>
                  {gpxStats && (
                    <div className="grid grid-cols-3 gap-2 shrink-0">
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                        <p className="text-gray-400 text-xs mb-1">Distance</p>
                        <p className="text-base font-bold text-cyan-400">{gpxStats.totalDistance} km</p>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                        <p className="text-gray-400 text-xs mb-1">D+</p>
                        <p className="text-base font-bold text-cyan-400">{gpxStats.elevationGain} m</p>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                        <p className="text-gray-400 text-xs mb-1">Alt. max</p>
                        <p className="text-base font-bold text-cyan-400">{gpxStats.maxAlt} m</p>
                      </div>
                    </div>
                  )}
                  {elevationProfile.length > 0 && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex-1 flex flex-col min-h-0">
                      <h3 className="text-xs font-semibold text-gray-400 mb-2 shrink-0">Profil d&apos;altitude</h3>
                      <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={elevationProfile} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <defs>
                              <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="distance" tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => `${v}km`} />
                            <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => `${v}m`} width={40} />
                            <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }} labelStyle={{ color: "#9ca3af" }} itemStyle={{ color: "#06b6d4" }} formatter={(value) => [`${value} m`, "Altitude"]} labelFormatter={(label) => `${label} km`} />
                            <Area type="monotone" dataKey="altitude" stroke="#06b6d4" strokeWidth={2} fill="url(#altGradient)" dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {summit.latitude && summit.longitude && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h2 className="text-xl font-bold">Météo et conditions de vol</h2>
              <div className="flex gap-2 sm:gap-3 flex-wrap">
                <a href={`https://www.meteo-parapente.com/${summit.latitude}/${summit.longitude}`} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm font-semibold px-3 sm:px-5 py-2 rounded-xl border bg-zinc-900 border-zinc-700 text-gray-300 hover:border-cyan-500 transition">Meteo-Parapente</a>
                <a href="https://www.balisemeteo.com" target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm font-semibold px-3 sm:px-5 py-2 rounded-xl border bg-zinc-900 border-zinc-700 text-gray-300 hover:border-cyan-500 transition">Balises FFVL</a>
                <a href={`https://www.spotair.mobi?lat=${summit.latitude}&lng=${summit.longitude}&zoom=12&layers=wind,airspaces,webcams`} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm font-semibold px-3 sm:px-5 py-2 rounded-xl border bg-zinc-900 border-zinc-700 text-gray-300 hover:border-cyan-500 transition">Ouvrir SpotAiR</a>
                <a href={`https://fr.avalanche.report/#/map?lat=${summit.latitude}&lng=${summit.longitude}&zoom=10`} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm font-semibold px-3 sm:px-5 py-2 rounded-xl border bg-yellow-950 border-yellow-700 text-yellow-300 hover:border-yellow-400 transition">❄️ Bulletin Avalanche</a>
              </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="h-[500px] rounded-2xl overflow-hidden border border-zinc-800">
                <iframe src={`https://embed.windy.com/embed2.html?lat=${summit.latitude}&lon=${summit.longitude}&zoom=11&level=surface&overlay=wind&menu=&message=&marker=&calendar=&pressure=&type=map&location=coordinates&detail=&detailLat=${summit.latitude}&detailLon=${summit.longitude}&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`} width="100%" height="100%" frameBorder="0" />
              </div>
              <div className="h-[500px] rounded-2xl overflow-hidden border border-zinc-800">
                <iframe src={`https://www.spotair.mobi/widget/map?lat=${summit.latitude}&lng=${summit.longitude}&zoom=12&layers=wind,airspaces,webcams`} width="100%" height="100%" frameBorder="0" />
              </div>
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Photos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((url, index) => (
                <img key={index} src={url} alt={`Photo ${index + 1}`} className="w-full h-48 object-cover rounded-2xl border border-zinc-800" />
              ))}
            </div>
          </div>
        )}

        <p className="text-gray-600 text-sm">Ajouté le {new Date(topo.created_at).toLocaleDateString("fr-FR")}</p>
      </section>
    </main>
  );
}
