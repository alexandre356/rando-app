"use client";

import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";
import { useEffect, useState, useRef } from "react";
import Map, { Marker, Popup, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

type Summit = {
  id: string;
  name: string;
  massif: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  outing_count?: number;
  topo_count?: number;
  last_outing_date?: string | null;
  max_elevation_gain?: number | null;
  orientations?: string[];
};

type GeocodingResult = {
  place_name: string;
  center: [number, number];
};

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Couleurs fonctionnelles (légende d'activité récente) — conservées telles quelles,
// indépendantes de la palette de marque, comme le rouge pour les actions destructrices.
function getMarkerColor(summit: Summit): string {
  if (!summit.last_outing_date) return "#6b7280";
  const daysAgo = Math.floor((Date.now() - new Date(summit.last_outing_date).getTime()) / (1000 * 60 * 60 * 24));
  if (daysAgo <= 7) return "#f97316";
  if (daysAgo <= 30) return "#22c55e";
  return "#3b82f6";
}

export default function MapPage() {
  const [summits, setSummits] = useState<Summit[]>([]);
  const [selectedSummit, setSelectedSummit] = useState<Summit | null>(null);
  const [viewState, setViewState] = useState({ longitude: 6.5, latitude: 45.5, zoom: 7 });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [massif, setMassif] = useState("");
  const [minElevation, setMinElevation] = useState(0);
  const [maxElevation, setMaxElevation] = useState(5000);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(50);
  const [useRadius, setUseRadius] = useState(false);
  const [locating, setLocating] = useState(false);
  const [positionLabel, setPositionLabel] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<GeocodingResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const citySearchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [filterOrientations, setFilterOrientations] = useState<string[]>([]);
  const [filterRecent, setFilterRecent] = useState(false);
  const [clusterZoom, setClusterZoom] = useState(viewState.zoom);

  function getClusters(summits: Summit[], zoom: number) {
    const clusterRadius = zoom < 8 ? 2.5 : zoom < 10 ? 1.2 : zoom < 12 ? 0.5 : 0;
    if (clusterRadius === 0) return summits.map((s) => ({ ...s, cluster: false, count: 1, summitsInCluster: [s] }));

    const clustered: Array<{ lat: number; lng: number; count: number; color: string; summitsInCluster: Summit[] }> = [];
    const used = new Set<string>();

    for (const summit of summits) {
      if (used.has(summit.id) || !summit.latitude || !summit.longitude) continue;
      const nearby = summits.filter((s) => {
        if (used.has(s.id) || !s.latitude || !s.longitude) return false;
        return Math.abs(s.latitude - summit.latitude!) < clusterRadius && Math.abs(s.longitude - summit.longitude!) < clusterRadius;
      });
      nearby.forEach((s) => used.add(s.id));
      const hasOrange = nearby.some((s) => {
        if (!s.last_outing_date) return false;
        return Math.floor((Date.now() - new Date(s.last_outing_date).getTime()) / (1000 * 60 * 60 * 24)) <= 7;
      });
      const hasGreen = nearby.some((s) => {
        if (!s.last_outing_date) return false;
        const days = Math.floor((Date.now() - new Date(s.last_outing_date).getTime()) / (1000 * 60 * 60 * 24));
        return days > 7 && days <= 30;
      });
      const color = hasOrange ? "#f97316" : hasGreen ? "#22c55e" : nearby.some((s) => s.last_outing_date) ? "#3b82f6" : "#6b7280";
      const avgLat = nearby.reduce((s, m) => s + (m.latitude || 0), 0) / nearby.length;
      const avgLng = nearby.reduce((s, m) => s + (m.longitude || 0), 0) / nearby.length;
      clustered.push({ lat: avgLat, lng: avgLng, count: nearby.length, color, summitsInCluster: nearby });
    }
    return clustered;
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);

      const { data: summitsData } = await supabase
        .from("summits")
        .select("*")
        .eq("status", "approved");

      const summitsList = summitsData || [];

      const { data: outingsData } = await supabase
        .from("outings")
        .select("summit_id, date")
        .not("summit_id", "is", null);

      const outingsBySummit: Record<string, { count: number; lastDate: string }> = {};
      for (const o of outingsData || []) {
        if (!o.summit_id) continue;
        if (!outingsBySummit[o.summit_id]) {
          outingsBySummit[o.summit_id] = { count: 0, lastDate: o.date };
        }
        outingsBySummit[o.summit_id].count++;
        if (o.date > outingsBySummit[o.summit_id].lastDate) {
          outingsBySummit[o.summit_id].lastDate = o.date;
        }
      }

      const { data: toposData } = await supabase
        .from("topos")
        .select("summit_id, elevation_gain, orientation")
        .eq("status", "approved");

      const elevationBySummit: Record<string, number> = {};
      const orientationsBySummit: Record<string, Set<string>> = {};
      const topoCountBySummit: Record<string, number> = {};
      for (const t of toposData || []) {
        if (!t.summit_id) continue;
        topoCountBySummit[t.summit_id] = (topoCountBySummit[t.summit_id] || 0) + 1;
        if (t.elevation_gain && (!elevationBySummit[t.summit_id] || t.elevation_gain > elevationBySummit[t.summit_id])) {
          elevationBySummit[t.summit_id] = t.elevation_gain;
        }
        if (t.orientation) {
          if (!orientationsBySummit[t.summit_id]) orientationsBySummit[t.summit_id] = new Set();
          t.orientation.split(",").forEach((o: string) => orientationsBySummit[t.summit_id].add(o.trim()));
        }
      }

      setSummits(summitsList.map((s) => ({
        ...s,
        outing_count: outingsBySummit[s.id]?.count || 0,
        topo_count: topoCountBySummit[s.id] || 0,
        last_outing_date: outingsBySummit[s.id]?.lastDate || null,
        max_elevation_gain: elevationBySummit[s.id] || null,
        orientations: orientationsBySummit[s.id] ? Array.from(orientationsBySummit[s.id]) : [],
      })));
    }
    load();
  }, []);

  async function handleCitySearch(value: string) {
    setCitySearch(value);
    setShowSuggestions(true);
    if (citySearchTimeout.current) clearTimeout(citySearchTimeout.current);
    if (value.length < 2) { setCitySuggestions([]); return; }
    citySearchTimeout.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${token}&country=fr,ch,it&types=place,locality&language=fr`);
      const data = await res.json();
      setCitySuggestions(data.features || []);
    }, 300);
  }

  function handleSelectCity(result: GeocodingResult) {
    const [lng, lat] = result.center;
    setUserPosition({ lat, lng });
    setUseRadius(true);
    setPositionLabel(result.place_name.split(",")[0]);
    setCitySearch(result.place_name.split(",")[0]);
    setShowSuggestions(false);
    setViewState({ latitude: lat, longitude: lng, zoom: 9 });
  }

  function handleLocate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUseRadius(true);
        setPositionLabel("Ma position");
        setCitySearch("");
        setViewState({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, zoom: 9 });
        setLocating(false);
      },
      () => { alert("Impossible d'obtenir votre position."); setLocating(false); }
    );
  }

  const filteredSummits = summits.filter((s) => {
    if (!s.latitude || !s.longitude) return false;
    if (s.latitude < -90 || s.latitude > 90) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (massif && s.massif !== massif) return false;
    if (maxElevation < 5000 && s.max_elevation_gain && s.max_elevation_gain > maxElevation) return false;
    if (minElevation > 0 && (!s.max_elevation_gain || s.max_elevation_gain < minElevation)) return false;
    if (filterOrientations.length > 0) {
      const summitOrientations = s.orientations || [];
      const hasMatch = filterOrientations.some((o) => summitOrientations.includes(o));
      if (!hasMatch) return false;
    }
    if (filterRecent) {
      if (!s.last_outing_date) return false;
      const daysAgo = Math.floor((Date.now() - new Date(s.last_outing_date).getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo > 30) return false;
    }
    if (useRadius && userPosition) {
      const dist = getDistanceKm(userPosition.lat, userPosition.lng, s.latitude, s.longitude);
      if (dist > radius) return false;
    }
    return true;
  });

  return (
    <main className="min-h-screen bg-[#E4E4E4] text-[#1C0F12] overflow-x-hidden">
      <Navbar />

      <div className="p-5 sm:p-10">
        <div className="mb-2">
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-2">Carte Hike &amp; Fly</h1>
          <p
            className="text-2xl mb-4"
            style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", color: "#B5179E" }}
          >
            &ldquo;Si le topo dit facile, prévois compliqué.&rdquo;
          </p>

          {isLoggedIn === true && (
            <a href="/submit-rando" className="block sm:inline-block sm:w-64 text-center bg-[#1C0F12] hover:bg-[#BEBCC8] hover:text-[#1C0F12] text-[#E4E4E4] transition px-6 py-3 rounded-xl font-bold">
              + Ajouter une randonnée
            </a>
          )}

          {isLoggedIn === false && (
            <p className="text-sm text-[#6F7E86]">
              <a href="/" className="text-[#1C0F12] hover:underline font-bold">Connecte-toi</a> pour ajouter une randonnée à la carte.
            </p>
          )}
        </div>

        <p className="text-[#6F7E86] mb-6">{filteredSummits.length} sommet(s)</p>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <input type="text" placeholder="Recherche par nom" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white border border-[#B9CFD0] rounded-xl px-4 py-3 text-sm text-[#1C0F12] placeholder-[#6F7E86] focus:outline-none focus:border-[#1C0F12]" />
          <select value={massif} onChange={(e) => setMassif(e.target.value)} className="bg-white border border-[#B9CFD0] rounded-xl px-4 py-3 text-sm text-[#1C0F12] focus:outline-none focus:border-[#1C0F12]">
            <option value="">Tous massifs</option>
            <option value="Bornes - Aravis">Bornes - Aravis</option>
            <option value="Chablais - Faucigny">Chablais - Faucigny</option>
            <option value="Haut Giffre - Aiguilles Rouges">Haut Giffre - Aiguilles Rouges</option>
            <option value="Mont Blanc">Mont Blanc</option>
            <option value="Bauges">Bauges</option>
            <option value="Beaufortain">Beaufortain</option>
            <option value="Vanoise">Vanoise</option>
            <option value="Belledonne">Belledonne</option>
            <option value="Chartreuse">Chartreuse</option>
            <option value="Vercors">Vercors</option>
            <option value="Ecrins">Ecrins</option>
            <option value="Mercantour">Mercantour</option>
            <option value="Jura">Jura</option>
            <option value="Massif Central">Massif Central</option>
            <option value="Vosges">Vosges</option>
            <option value="Corse">Corse</option>
          </select>
          <div className="flex items-center gap-3 relative">
            <button onClick={handleLocate} disabled={locating} className={`px-4 py-3 rounded-xl font-bold text-sm border transition shrink-0 ${useRadius && positionLabel === "Ma position" ? "bg-[#1C0F12] border-[#1C0F12] text-[#E4E4E4]" : "bg-white border-[#B9CFD0] text-[#6F7E86] hover:border-[#1C0F12]"} disabled:opacity-50`}>
              {locating ? "..." : "Ma position"}
            </button>
            <div className="relative flex-1">
              <input type="text" placeholder="Recherche par ville..." value={citySearch} onChange={(e) => handleCitySearch(e.target.value)} onFocus={() => setShowSuggestions(true)} className="w-full bg-white border border-[#B9CFD0] rounded-xl px-4 py-3 text-sm text-[#1C0F12] placeholder-[#6F7E86] focus:outline-none focus:border-[#1C0F12]" />
              {showSuggestions && citySuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#B9CFD0] rounded-xl overflow-hidden z-50">
                  {citySuggestions.map((result, index) => (
                    <button key={index} onClick={() => handleSelectCity(result)} className="w-full text-left px-4 py-3 hover:bg-[#B9CFD0]/20 text-sm text-[#1C0F12] border-b border-[#B9CFD0]/50 last:border-0">
                      {result.place_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {useRadius && (
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <span className="text-[#6F7E86] text-sm">Rayon :</span>
            <input type="range" min={5} max={200} step={5} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-48 accent-[#1C0F12]" />
            <span className="text-[#1C0F12] font-bold text-sm w-16">{radius} km</span>
            <button onClick={() => { setUseRadius(false); setUserPosition(null); setPositionLabel(""); setCitySearch(""); }} className="text-xs text-red-700 hover:text-red-800">Désactiver</button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[#6F7E86] text-sm shrink-0">D+ max :</span>
            <input type="range" min={0} max={3000} step={100} value={maxElevation === 5000 ? 3000 : maxElevation} onChange={(e) => setMaxElevation(Number(e.target.value) === 3000 ? 5000 : Number(e.target.value))} className="w-36 accent-[#1C0F12]" />
            <span className="text-[#1C0F12] font-bold text-sm w-20">{maxElevation >= 5000 ? "Tous" : `≤ ${maxElevation} m`}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#6F7E86] text-sm shrink-0">D+ min :</span>
            <input type="range" min={0} max={2000} step={100} value={minElevation} onChange={(e) => setMinElevation(Number(e.target.value))} className="w-36 accent-[#1C0F12]" />
            <span className="text-[#1C0F12] font-bold text-sm w-20">{minElevation === 0 ? "Tous" : `≥ ${minElevation} m`}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[#6F7E86] text-sm shrink-0">Orientation :</span>
            <svg width="80" height="80" viewBox="0 0 200 200" className="shrink-0">
              {[
                { code: "N", angle: 0 }, { code: "NE", angle: 45 },
                { code: "E", angle: 90 }, { code: "SE", angle: 135 },
                { code: "S", angle: 180 }, { code: "SO", angle: 225 },
                { code: "O", angle: 270 }, { code: "NO", angle: 315 },
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
                const isSelected = filterOrientations.includes(dir.code);
                return (
                  <g key={dir.code} onClick={() => setFilterOrientations((prev) => prev.includes(dir.code) ? prev.filter((o) => o !== dir.code) : [...prev, dir.code])} className="cursor-pointer">
                    <path d={path} fill={isSelected ? "#1C0F12" : "#B9CFD0"} stroke="#E4E4E4" strokeWidth={1.5} opacity={isSelected ? 1 : 0.6} className="hover:opacity-90 transition-opacity" />
                  </g>
                );
              })}
              <circle cx={100} cy={100} r={26} fill="#E4E4E4" stroke="#B9CFD0" strokeWidth={1} />
              <text x={100} y={100} textAnchor="middle" dominantBaseline="central" fontSize="20" fill="#6F7E86">+</text>
            </svg>
            {filterOrientations.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filterOrientations.map((o) => (
                  <span key={o} className="bg-[#1C0F12] text-[#E4E4E4] text-xs px-2 py-1 rounded-full font-bold">{o}</span>
                ))}
                <button onClick={() => setFilterOrientations([])} className="text-xs text-red-700 hover:text-red-800 ml-1">✕</button>
              </div>
            )}
          </div>

          <button onClick={() => setFilterRecent(!filterRecent)} className={`text-xs font-bold px-3 py-2 rounded-xl border transition ${filterRecent ? "bg-[#1C0F12] border-[#1C0F12] text-[#E4E4E4]" : "bg-white border-[#B9CFD0] text-[#6F7E86] hover:border-[#1C0F12]"}`}>
            🔥 Actifs ce mois
          </button>
        </div>

        {/* Légende — couleurs fonctionnelles conservées (indiquent la récence, pas la marque) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#6F7E86] mb-6">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span> &lt; 7j</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> &lt; 30j</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> Ancien</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-500 inline-block"></span> Aucune</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-380px)] lg:min-h-[500px]">
          <div className="flex-1 rounded-2xl overflow-hidden border border-[#B9CFD0] h-[400px] lg:h-auto">
            <Map
              {...viewState}
              onMove={(e) => setViewState(e.viewState)}
              onClick={() => setSelectedSummit(null)}
              mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
              mapStyle="mapbox://styles/mapbox/outdoors-v12"
              style={{ width: "100%", height: "100%" }}
              maxBounds={[[-5.5, 41.0], [10.0, 51.5]]}
            >
              {userPosition && (
                <Marker longitude={userPosition.lng} latitude={userPosition.lat} anchor="center">
                  <div className="w-4 h-4 bg-[#1C0F12] rounded-full border-2 border-white shadow-lg" />
                </Marker>
              )}

              {getClusters(filteredSummits, viewState.zoom).map((cluster, i) => {
                if ('id' in cluster) {
                  const summit = cluster as Summit;
                  const color = getMarkerColor(summit);
                  const count = summit.outing_count || 0;
                  return (
                    <Marker key={summit.id} longitude={summit.longitude!} latitude={summit.latitude!} anchor="center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedSummit(summit); setViewState({ longitude: summit.longitude!, latitude: summit.latitude!, zoom: 13 }); }}
                        className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg font-bold text-xs text-white transition hover:scale-110"
                        style={{ backgroundColor: color }}
                      >
                        {count > 0 ? count : ""}
                      </button>
                    </Marker>
                  );
                } else {
                  const c = cluster as { lat: number; lng: number; count: number; color: string; summitsInCluster: Summit[] };
                  const size = c.count === 1 ? 32 : c.count < 5 ? 40 : c.count < 15 ? 48 : 56;
                  return (
                    <Marker key={`cluster-${i}`} longitude={c.lng} latitude={c.lat} anchor="center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewState({ longitude: c.lng, latitude: c.lat, zoom: Math.min(viewState.zoom + 2, 14) }); }}
                        className="flex items-center justify-center rounded-full border-2 border-white shadow-xl font-bold text-white transition hover:scale-110"
                        style={{ backgroundColor: c.color, width: size, height: size, fontSize: size > 40 ? 14 : 11 }}
                      >
                        {c.count}
                      </button>
                    </Marker>
                  );
                }
              })}

              {selectedSummit && selectedSummit.latitude && selectedSummit.longitude && (
                <Popup longitude={selectedSummit.longitude} latitude={selectedSummit.latitude} onClose={() => setSelectedSummit(null)} closeOnClick={false}>
                  <div className="text-[#1C0F12]" onClick={(e) => e.stopPropagation()}>
                    <h2 className="font-bold text-base mb-1">{selectedSummit.name}</h2>
                    <p className="text-sm text-[#6F7E86] mb-2">{selectedSummit.massif}</p>
                    <p className="text-xs text-[#6F7E86] mb-2">{selectedSummit.topo_count || 0} topo(s)</p>
                    <a href={`/summit/${selectedSummit.id}`} className="text-[#1C0F12] font-bold text-sm hover:underline block">
                      Voir les topos
                    </a>
                  </div>
                </Popup>
              )}
            </Map>
          </div>

          <div className="w-full lg:w-80 overflow-y-auto space-y-3 pr-1 max-h-96 lg:max-h-none">
            {filteredSummits.length === 0 ? (
              <div className="bg-white border border-[#B9CFD0] rounded-2xl p-6 text-center">
                <p className="text-[#6F7E86]">Aucun sommet trouvé</p>
              </div>
            ) : (
              filteredSummits.map((summit) => {
                const color = getMarkerColor(summit);
                return (
                  <div
                    key={summit.id}
                    className="bg-white border border-[#B9CFD0] rounded-2xl p-4 hover:border-[#1C0F12] transition cursor-pointer"
                    onClick={() => { setSelectedSummit(summit); setViewState({ longitude: summit.longitude!, latitude: summit.latitude!, zoom: 11 }); }}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <h2 className="text-lg font-bold">{summit.name}</h2>
                    </div>
                    <p className="text-[#6F7E86] text-sm">{summit.massif || "Non renseigné"}</p>
                    <p className="text-[#6F7E86] text-xs mt-1">{summit.topo_count || 0} topo(s){summit.max_elevation_gain ? ` · D+ ${summit.max_elevation_gain} m` : ""}</p>
                    {userPosition && summit.latitude && summit.longitude && (
                      <p className="text-[#1C0F12] font-bold text-xs mt-1">
                        {Math.round(getDistanceKm(userPosition.lat, userPosition.lng, summit.latitude, summit.longitude))} km {positionLabel ? `de ${positionLabel}` : "de vous"}
                      </p>
                    )}
                    <a href={`/summit/${summit.id}`} onClick={(e) => e.stopPropagation()} className="text-[#1C0F12] hover:underline text-xs mt-2 inline-block font-bold">
                      Voir les topos
                    </a>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
