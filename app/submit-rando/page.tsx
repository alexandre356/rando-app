"use client";

import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const massifs = [
  "Bornes - Aravis", "Chablais - Faucigny", "Haut Giffre - Aiguilles Rouges",
  "Mont Blanc", "Bauges", "Beaufortain", "Vanoise", "Belledonne",
  "Chartreuse", "Vercors", "Ecrins", "Queyras - Alpes Cozie N",
  "Mercantour", "Jura", "Massif Central", "Vosges", "Corse",
];

const massifCoords: Record<string, { longitude: number; latitude: number; zoom: number }> = {
  "Bornes - Aravis":                 { longitude: 6.35,  latitude: 45.85, zoom: 10 },
  "Chablais - Faucigny":             { longitude: 6.60,  latitude: 46.15, zoom: 10 },
  "Haut Giffre - Aiguilles Rouges": { longitude: 6.75,  latitude: 46.00, zoom: 10 },
  "Mont Blanc":                      { longitude: 6.86,  latitude: 45.83, zoom: 10 },
  "Bauges":                          { longitude: 6.20,  latitude: 45.65, zoom: 10 },
  "Beaufortain":                     { longitude: 6.55,  latitude: 45.70, zoom: 10 },
  "Vanoise":                         { longitude: 6.85,  latitude: 45.40, zoom: 10 },
  "Belledonne":                      { longitude: 6.00,  latitude: 45.25, zoom: 10 },
  "Chartreuse":                      { longitude: 5.75,  latitude: 45.38, zoom: 10 },
  "Vercors":                         { longitude: 5.55,  latitude: 44.95, zoom: 10 },
  "Ecrins":                          { longitude: 6.35,  latitude: 44.85, zoom: 10 },
  "Queyras - Alpes Cozie N":        { longitude: 6.90,  latitude: 44.65, zoom: 10 },
  "Mercantour":                      { longitude: 7.10,  latitude: 44.20, zoom: 10 },
  "Jura":                            { longitude: 5.90,  latitude: 46.50, zoom: 9  },
  "Massif Central":                  { longitude: 2.90,  latitude: 45.50, zoom: 8  },
  "Vosges":                          { longitude: 7.10,  latitude: 48.10, zoom: 9  },
  "Corse":                           { longitude: 9.10,  latitude: 42.10, zoom: 8  },
};

function getNearestMassif(lat: number, lng: number): string {
  let nearest = "";
  let minDist = Infinity;
  for (const [name, coords] of Object.entries(massifCoords)) {
    const dist = Math.sqrt((lat - coords.latitude) ** 2 + (lng - coords.longitude) ** 2);
    if (dist < minDist) { minDist = dist; nearest = name; }
  }
  return nearest;
}

type Summit = { id: string; name: string; massif: string | null; latitude: number | null; longitude: number | null; };

async function reverseGeocode(lat: number, lng: number, token: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=fr&types=poi,locality,neighborhood,place`
    );
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      return data.features[0].text || "";
    }
  } catch (e) { console.error(e); }
  return "";
}

export default function SubmitRandoPage() {
  const searchParams = useSearchParams();
  const preselectSummitId = searchParams.get("summitId");

  const [mode, setMode] = useState<"new" | "existing">(preselectSummitId ? "existing" : "new");
  const [existingSummits, setExistingSummits] = useState<Summit[]>([]);
  const [selectedSummit, setSelectedSummit] = useState<Summit | null>(null);
  const [popupSummit, setPopupSummit] = useState<Summit | null>(null);
  const [filterMassif, setFilterMassif] = useState("");
  const [placingMode, setPlacingMode] = useState<"spot" | "start" | "takeoff" | "refuge">("start");
  const [takeoffLat, setTakeoffLat] = useState("");
  const [takeoffLng, setTakeoffLng] = useState("");
  const [refugeName, setRefugeName] = useState("");
  const [refugeLat, setRefugeLat] = useState("");
  const [refugeLng, setRefugeLng] = useState("");

  // Spot
  const [spotName, setSpotName] = useState("");
  const [massif, setMassif] = useState("");
  const [spotLat, setSpotLat] = useState("");
  const [spotLng, setSpotLng] = useState("");

  // Départ rando
  const [startName, setStartName] = useState("");
  const [startLat, setStartLat] = useState("");
  const [startLng, setStartLng] = useState("");

  // Itinéraire
  const [topoName, setTopoName] = useState("");
  const [takeoffName, setTakeoffName] = useState("");
  const [landingName, setLandingName] = useState("");
  const [orientations, setOrientations] = useState<string[]>([]);
  const [elevationGain, setElevationGain] = useState("");
  const [hasWindsock, setHasWindsock] = useState(false);
  const [approachType, setApproachType] = useState("");
  const [approachNotes, setApproachNotes] = useState("");
  const [danger, setDanger] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [gpxFile, setGpxFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [viewState, setViewState] = useState({ longitude: 6.5, latitude: 45.5, zoom: 7 });

  useEffect(() => {
    async function loadSummits() {
      const { data } = await supabase.from("summits").select("id, name, massif, latitude, longitude").eq("status", "approved");
      const summitsList = data || [];
      setExistingSummits(summitsList);

      // Pré-sélection depuis l'URL (?summitId=...), ex: bouton "+ Ajouter un topo" sur une fiche sommet
      if (preselectSummitId) {
        const match = summitsList.find((s) => s.id === preselectSummitId);
        if (match) {
          setMode("existing");
          setSelectedSummit(match);
          if (match.massif) setFilterMassif(match.massif);
          if (match.latitude && match.longitude) {
            setViewState({ longitude: match.longitude, latitude: match.latitude, zoom: 12 });
          }
        }
      }
    }
    loadSummits();
  }, [preselectSummitId]);

  function handleMapClick(event: { lngLat: { lat: number; lng: number } }) {
    const { lat, lng } = event.lngLat;
    if (mode === "existing") return;
    setSpotLat(lat.toFixed(6));
    setSpotLng(lng.toFixed(6));
    const nearest = getNearestMassif(lat, lng);
    if (nearest) setMassif(nearest);
  }

  function toggleOrientation(o: string) {
    setOrientations((prev) => prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const newPhotos = [...photos, ...files].slice(0, 5);
    setPhotos(newPhotos);
    setPreviews(newPhotos.map((f) => URL.createObjectURL(f)));
  }

  function removePhoto(index: number) {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPreviews(newPhotos.map((f) => URL.createObjectURL(f)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "new" && (!spotLat || !spotLng)) { alert("Veuillez placer le spot sur la carte."); return; }
    if (mode === "existing" && !selectedSummit) { alert("Veuillez sélectionner un spot existant."); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Vous devez être connecté."); return; }

    setSubmitting(true);

    let summitId: string;

    if (mode === "new") {
      const { data: summit, error } = await supabase.from("summits").insert({
        user_id: user.id,
        name: spotName,
        massif,
        latitude: Number(spotLat),
        longitude: Number(spotLng),
        status: "pending",
      }).select().single();
      if (error) { alert(error.message); setSubmitting(false); return; }
      summitId = summit.id;
    } else {
      summitId = selectedSummit!.id;
    }

    const { data: topo, error: topoError } = await supabase.from("topos").insert({
      user_id: user.id,
      summit_id: summitId,
      name: topoName || "Itinéraire principal",
      takeoff_name: takeoffName || null,
      landing_name: landingName || null,
      start_name: startName || null,
      start_latitude: startLat ? Number(startLat) : null,
      start_longitude: startLng ? Number(startLng) : null,
      takeoff_latitude: takeoffLat ? Number(takeoffLat) : null,
      takeoff_longitude: takeoffLng ? Number(takeoffLng) : null,
      refuge_name: refugeName || null,
      refuge_latitude: refugeLat ? Number(refugeLat) : null,
      refuge_longitude: refugeLng ? Number(refugeLng) : null,
      orientation: orientations.join(",") || null,
      elevation_gain: elevationGain ? Number(elevationGain) : null,
      has_windsock: hasWindsock,
      approach_type: approachType || null,
      approach_notes: approachNotes || null,
      danger: danger || null,
      status: "pending",
    }).select().single();

    if (topoError) { alert(topoError.message); setSubmitting(false); return; }

    const uploadErrors: string[] = [];

    for (const photo of photos) {
      const { error: photoError } = await supabase.storage
        .from("sites")
        .upload(`${topo.id}/${Date.now()}-${photo.name}`, photo);
      if (photoError) uploadErrors.push(`Photo ${photo.name} : ${photoError.message}`);
    }

    if (gpxFile) {
      const { error: gpxError } = await supabase.storage
        .from("gpx")
        .upload(`${topo.id}/${Date.now()}-${gpxFile.name}`, gpxFile);
      if (gpxError) uploadErrors.push(`GPX : ${gpxError.message}`);
    }

    if (uploadErrors.length > 0) {
      alert(
        "La randonnée a été créée, mais certains fichiers n'ont pas pu être envoyés :\n\n" +
        uploadErrors.join("\n") +
        "\n\nVous pourrez les rajouter plus tard depuis Supabase si besoin."
      );
    } else {
      alert("Randonnée soumise ! Elle sera visible après validation.");
    }

    window.location.href = "/map";
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="p-5 sm:p-10">
        <a href="/map" className="text-gray-400 hover:text-green-400 transition mb-8 inline-block">&larr; Retour à la carte</a>

        <h1 className="text-3xl sm:text-5xl font-bold mb-4">Ajouter une randonnée Hike &amp; Fly</h1>
        <p className="text-rose-400 italic text-sm mb-8">&ldquo;Une voile pliée ne ferme jamais.&rdquo;</p>

        {/* Choix du mode */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <button type="button" onClick={() => { setMode("new"); setSelectedSummit(null); }}
            className={`p-6 rounded-2xl border-2 transition text-left ${mode === "new" ? "border-green-500 bg-green-950" : "border-zinc-700 bg-zinc-900 hover:border-green-500"}`}>
            <p className="text-2xl mb-2">🗺️</p>
            <p className="text-xl font-bold mb-1">Nouveau spot</p>
            <p className="text-gray-400 text-sm">Ce spot n&apos;existe pas encore — je le crée avec mon itinéraire.</p>
          </button>
          <button type="button" onClick={() => { setMode("existing"); setSpotLat(""); setSpotLng(""); }}
            className={`p-6 rounded-2xl border-2 transition text-left ${mode === "existing" ? "border-cyan-500 bg-cyan-950" : "border-zinc-700 bg-zinc-900 hover:border-cyan-500"}`}>
            <p className="text-2xl mb-2">📍</p>
            <p className="text-xl font-bold mb-1">Spot existant</p>
            <p className="text-gray-400 text-sm">Ce spot est déjà sur la carte — j&apos;ajoute un nouvel itinéraire.</p>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* SECTION 1 — Le spot */}
          {mode === "new" ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
              <h2 className="text-2xl font-bold text-green-400">Le spot</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <input type="text" placeholder="Nom du spot (ex: Salève, Pointe de Miribel...)" value={spotName}
                  onChange={(e) => setSpotName(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" required />
                <select value={massif} onChange={(e) => { setMassif(e.target.value); if (massifCoords[e.target.value]) setViewState(massifCoords[e.target.value]); }}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" required>
                  <option value="">Choisir un massif</option>
                  {massifs.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <p className="text-gray-400 text-sm mb-2">Cliquez sur la carte pour placer le sommet</p>
                {spotLat && spotLng
                  ? <p className="text-green-400 text-sm mb-2">📍 {spotLat}, {spotLng} {massif && `— ${massif}`}</p>
                  : <p className="text-yellow-500 text-sm mb-2">Aucune position sélectionnée</p>
                }

                <div className="w-full h-80 rounded-2xl overflow-hidden border border-zinc-700">
                  <Map {...viewState} onMove={(e) => setViewState(e.viewState)} onClick={handleMapClick}
                    mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                    mapStyle="mapbox://styles/mapbox/outdoors-v12"
                    style={{ width: "100%", height: "100%" }}
                    cursor="crosshair" maxBounds={[[-5.5, 41.0], [10.0, 51.5]]}>
                    {spotLat && spotLng && (
                      <Marker longitude={Number(spotLng)} latitude={Number(spotLat)} anchor="center">
                        <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-lg" />
                      </Marker>
                    )}
                    {startLat && startLng && (
                      <Marker longitude={Number(startLng)} latitude={Number(startLat)} anchor="center">
                        <div className="w-4 h-4 bg-amber-400 rounded-full border-2 border-white shadow-lg" />
                      </Marker>
                    )}
                  </Map>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-4">
              <h2 className="text-2xl font-bold text-cyan-400">Choisir le spot existant</h2>

              {selectedSummit && (
                <div className="bg-cyan-950 border border-cyan-500 rounded-xl px-5 py-4">
                  <p className="font-bold text-cyan-300 text-lg">{selectedSummit.name}</p>
                  <p className="text-gray-400 text-sm">{selectedSummit.massif}</p>
                  <button type="button" onClick={() => setSelectedSummit(null)} className="text-xs text-red-400 hover:text-red-300 mt-2">Désélectionner</button>
                </div>
              )}

              <div className="grid lg:grid-cols-4 gap-4">
                <div className="lg:col-span-1 bg-black border border-zinc-700 rounded-2xl p-4 overflow-y-auto max-h-96">
                  <p className="text-gray-400 text-xs font-semibold mb-3 uppercase tracking-wide">Massifs</p>
                  <button type="button" onClick={() => { setFilterMassif(""); setViewState({ longitude: 6.5, latitude: 45.5, zoom: 7 }); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm mb-1 transition ${filterMassif === "" ? "bg-cyan-500 text-white font-semibold" : "text-gray-300 hover:bg-zinc-800"}`}>
                    Tous ({existingSummits.length})
                  </button>
                  {massifs.map((m) => {
                    const count = existingSummits.filter((s) => s.massif === m).length;
                    if (count === 0) return null;
                    return (
                      <button key={m} type="button" onClick={() => { setFilterMassif(m); if (massifCoords[m]) setViewState(massifCoords[m]); }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm mb-1 transition ${filterMassif === m ? "bg-cyan-500 text-white font-semibold" : "text-gray-300 hover:bg-zinc-800"}`}>
                        {m} <span className="text-xs opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>

                <div className="lg:col-span-3 h-96 rounded-2xl overflow-hidden border border-zinc-700">
                  <Map {...viewState} onMove={(e) => setViewState(e.viewState)}
                    mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                    mapStyle="mapbox://styles/mapbox/outdoors-v12"
                    style={{ width: "100%", height: "100%" }}
                    maxBounds={[[-5.5, 41.0], [10.0, 51.5]]}>
                    {existingSummits.filter((s) => s.latitude && s.longitude && (filterMassif === "" || s.massif === filterMassif)).map((summit) => (
                      <Marker key={summit.id} longitude={summit.longitude!} latitude={summit.latitude!} anchor="center">
                        <button type="button"
                          onClick={() => { setSelectedSummit(summit); setPopupSummit(null); }}
                          onMouseEnter={() => setPopupSummit(summit)}
                          onMouseLeave={() => setPopupSummit(null)}
                          className={`w-8 h-8 rounded-full border-2 border-white shadow-lg transition hover:scale-110 ${selectedSummit?.id === summit.id ? "bg-cyan-500 scale-125" : "bg-green-500"}`} />
                      </Marker>
                    ))}
                    {popupSummit?.latitude && popupSummit?.longitude && (
                      <Popup longitude={popupSummit.longitude} latitude={popupSummit.latitude} closeButton={false} anchor="bottom" offset={20}>
                        <div className="text-black text-sm font-semibold">{popupSummit.name}</div>
                        <div className="text-gray-500 text-xs">{popupSummit.massif}</div>
                      </Popup>
                    )}
                  </Map>
                </div>
              </div>

              {filterMassif && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {existingSummits.filter((s) => s.massif === filterMassif).map((summit) => (
                    <button key={summit.id} type="button" onClick={() => setSelectedSummit(summit)}
                      className={`text-left px-4 py-3 rounded-xl border transition text-sm ${selectedSummit?.id === summit.id ? "bg-cyan-500 border-cyan-500 text-white font-semibold" : "bg-black border-zinc-700 text-gray-300 hover:border-cyan-500"}`}>
                      {summit.name}
                    </button>
                  ))}
                </div>
              )}


            </div>
          )}

          {/* SECTION 2 — L'itinéraire */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-cyan-400">L&apos;itinéraire</h2>

            <input type="text" placeholder="Nom de l'itinéraire (optionnel — ex: Montée par le versant nord)" value={topoName}
              onChange={(e) => setTopoName(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" />

            <div>
              <p className="text-gray-300 mb-3">Placer sur la carte</p>
              <div className="flex gap-3 mb-3">
                <button type="button" onClick={() => setPlacingMode("start")}
                  className={`text-sm font-semibold px-4 py-2 rounded-xl border transition ${placingMode === "start" ? "bg-amber-500 border-amber-500 text-white" : "bg-black border-zinc-700 text-gray-300 hover:border-amber-500"}`}>
                  🅿️ Départ de la rando
                </button>
                <button type="button" onClick={() => setPlacingMode("takeoff")}
                  className={`text-sm font-semibold px-4 py-2 rounded-xl border transition ${placingMode === "takeoff" ? "bg-green-500 border-green-500 text-white" : "bg-black border-zinc-700 text-gray-300 hover:border-green-500"}`}>
                  📍 Décollage
                </button>
                <button type="button" onClick={() => setPlacingMode("refuge")}
                  className={`text-sm font-semibold px-4 py-2 rounded-xl border transition ${placingMode === "refuge" ? "bg-blue-500 border-blue-500 text-white" : "bg-black border-zinc-700 text-gray-300 hover:border-blue-500"}`}>
                  🏠 Refuge
                </button>
              </div>
              <p className="text-gray-500 text-xs mb-2">
                {placingMode === "start" ? "Cliquez sur la carte pour placer le départ de la randonnée" : placingMode === "refuge" ? "Cliquez sur la carte pour placer le refuge" : "Cliquez sur la carte pour placer le décollage"}
              </p>
              <div className="flex flex-wrap gap-4 mb-3">
                {startLat && startLng && (
                  <p className="text-amber-400 text-sm">🅿️ Départ placé <button type="button" onClick={() => { setStartLat(""); setStartLng(""); }} className="text-xs text-red-400 ml-2">✕</button></p>
                )}
                {takeoffLat && takeoffLng && (
                  <p className="text-green-400 text-sm">📍 Décollage placé <button type="button" onClick={() => { setTakeoffLat(""); setTakeoffLng(""); }} className="text-xs text-red-400 ml-2">✕</button></p>
                )}
                {refugeLat && refugeLng && (
                  <p className="text-blue-400 text-sm">🏠 Refuge placé <button type="button" onClick={() => { setRefugeLat(""); setRefugeLng(""); }} className="text-xs text-red-400 ml-2">✕</button></p>
                )}
              </div>
              <div className="w-full h-72 rounded-2xl overflow-hidden border border-zinc-700">
                <Map
                  longitude={spotLng ? Number(spotLng) : (selectedSummit?.longitude ?? 6.5)}
                  latitude={spotLat ? Number(spotLat) : (selectedSummit?.latitude ?? 45.5)}
                  zoom={spotLng || selectedSummit?.longitude ? 13 : 7}
                  onMove={() => {}}
                  onClick={async (e) => {
                    const { lat, lng } = e.lngLat;
                    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
                    if (placingMode === "start") {
                      setStartLat(lat.toFixed(6));
                      setStartLng(lng.toFixed(6));
                    } else if (placingMode === "refuge") {
                      setRefugeLat(lat.toFixed(6));
                      setRefugeLng(lng.toFixed(6));
                      const name = await reverseGeocode(lat, lng, token);
                      if (name && !refugeName) setRefugeName(name);
                    } else {
                      setTakeoffLat(lat.toFixed(6));
                      setTakeoffLng(lng.toFixed(6));
                      const name = await reverseGeocode(lat, lng, token);
                      if (name) setTakeoffName(name);
                    }
                  }}
                  mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                  mapStyle="mapbox://styles/mapbox/outdoors-v12"
                  style={{ width: "100%", height: "100%" }}
                  cursor="crosshair">
                  {mode === "new" && spotLat && spotLng && (
                    <Marker longitude={Number(spotLng)} latitude={Number(spotLat)} anchor="center">
                      <div className="w-4 h-4 bg-zinc-400 rounded-full border-2 border-white opacity-50" />
                    </Marker>
                  )}
                  {mode === "existing" && selectedSummit?.latitude && selectedSummit?.longitude && (
                    <Marker longitude={selectedSummit.longitude} latitude={selectedSummit.latitude} anchor="center">
                      <div className="w-4 h-4 bg-cyan-400 rounded-full border-2 border-white opacity-70" />
                    </Marker>
                  )}
                  {startLat && startLng && (
                    <Marker longitude={Number(startLng)} latitude={Number(startLat)} anchor="center">
                      <div className="w-4 h-4 bg-amber-400 rounded-full border-2 border-white shadow-lg" />
                    </Marker>
                  )}
                  {takeoffLat && takeoffLng && (
                    <Marker longitude={Number(takeoffLng)} latitude={Number(takeoffLat)} anchor="bottom">
                      <span className="text-2xl">📍</span>
                    </Marker>
                  )}
                  {refugeLat && refugeLng && (
                    <Marker longitude={Number(refugeLng)} latitude={Number(refugeLat)} anchor="bottom">
                      <span className="text-2xl">🏠</span>
                    </Marker>
                  )}
                </Map>
              </div>
            </div>

            {refugeLat && refugeLng && (
              <input type="text" placeholder="Nom du refuge (ex: Refuge de la Balme)" value={refugeName}
                onChange={(e) => setRefugeName(e.target.value)} className="w-full bg-black border border-blue-700 rounded-xl px-4 py-3" />
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <input type="text" placeholder="Nom du décollage" value={takeoffName} onChange={(e) => setTakeoffName(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" />
              <input type="text" placeholder="Nom de l'atterrissage" value={landingName} onChange={(e) => setLandingName(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" />
            </div>

            <div>
              <p className="text-gray-300 mb-3">Type d&apos;approche</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button type="button" onClick={() => setApproachType("Randonnée")} className={`rounded-xl border px-4 py-3 transition font-semibold ${approachType === "Randonnée" ? "bg-green-500 border-green-500 text-white" : "bg-black border-zinc-700 text-gray-300 hover:border-green-500"}`}>🥾 Randonnée</button>
                <button type="button" onClick={() => setApproachType("Alpinisme")} className={`rounded-xl border px-4 py-3 transition font-semibold ${approachType === "Alpinisme" ? "bg-orange-500 border-orange-500 text-white" : "bg-black border-zinc-700 text-gray-300 hover:border-orange-500"}`}>🧗 Alpinisme</button>
              </div>
              <textarea placeholder="Précisions sur l'approche (passages techniques, matériel...)" value={approachNotes} onChange={(e) => setApproachNotes(e.target.value)} rows={3} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" />
            </div>

            <div>
              <p className="text-gray-300 mb-3">Orientations du décollage — cliquez sur les pétales</p>
              <div className="flex items-center gap-8">
                <svg width="200" height="200" viewBox="0 0 200 200" className="shrink-0">
                  {[{ code: "N", angle: 0 }, { code: "NE", angle: 45 }, { code: "E", angle: 90 }, { code: "SE", angle: 135 },
                    { code: "S", angle: 180 }, { code: "SO", angle: 225 }, { code: "O", angle: 270 }, { code: "NO", angle: 315 }].map((dir) => {
                    const cx = 100; const cy = 100; const outerR = 78; const innerR = 30; const half = 22;
                    const a1 = ((dir.angle - half - 90) * Math.PI) / 180;
                    const a2 = ((dir.angle + half - 90) * Math.PI) / 180;
                    const x1 = cx + outerR * Math.cos(a1); const y1 = cy + outerR * Math.sin(a1);
                    const x2 = cx + outerR * Math.cos(a2); const y2 = cy + outerR * Math.sin(a2);
                    const ix1 = cx + innerR * Math.cos(a1); const iy1 = cy + innerR * Math.sin(a1);
                    const ix2 = cx + innerR * Math.cos(a2); const iy2 = cy + innerR * Math.sin(a2);
                    const path = `M ${ix1} ${iy1} L ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 0 0 ${ix1} ${iy1} Z`;
                    const lr = outerR + 16; const la = ((dir.angle - 90) * Math.PI) / 180;
                    const lx = cx + lr * Math.cos(la); const ly = cy + lr * Math.sin(la);
                    const isSelected = orientations.includes(dir.code);
                    return (
                      <g key={dir.code} onClick={() => toggleOrientation(dir.code)} className="cursor-pointer">
                        <path d={path} fill={isSelected ? "#22c55e" : "#27272a"} stroke="#000" strokeWidth={1.5} opacity={isSelected ? 1 : 0.7} />
                        <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight={isSelected ? "bold" : "normal"} fill={isSelected ? "#22c55e" : "#9ca3af"}>{dir.code}</text>
                      </g>
                    );
                  })}
                  <circle cx={100} cy={100} r={26} fill="#18181b" stroke="#3f3f46" strokeWidth={1} />
                  <text x={100} y={100} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#9ca3af">
                    {orientations.length > 0 ? orientations.join(" ") : "—"}
                  </text>
                </svg>
                <div className="text-sm text-gray-400">
                  <p className="mb-2">Orientations favorables du décollage.</p>
                  {orientations.length > 0 ? (
                    <div className="flex flex-wrap gap-2">{orientations.map((o) => <span key={o} className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold">{o}</span>)}</div>
                  ) : <p className="text-gray-600 italic">Aucune sélectionnée</p>}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <input type="number" placeholder="D+ en mètres" value={elevationGain} onChange={(e) => setElevationGain(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" />
              <button type="button" onClick={() => setHasWindsock(!hasWindsock)}
                className={`w-full rounded-xl border px-4 py-3 transition font-semibold flex items-center justify-center gap-2 ${hasWindsock ? "bg-green-500 border-green-500 text-white" : "bg-black border-zinc-700 text-gray-300 hover:border-green-500"}`}>
                🎏 Manche à air {hasWindsock ? "présente" : "absente"}
              </button>
            </div>

            <textarea placeholder="Dangers / remarques importantes" value={danger} onChange={(e) => setDanger(e.target.value)} rows={4} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" />
          </div>

          {/* SECTION 3 — Photos & GPX */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-purple-400">Photos &amp; GPX</h2>

            <div>
              <p className="text-gray-300 mb-3">Photos (5 maximum)</p>
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {previews.map((p, i) => (
                    <div key={i} className="relative">
                      <img src={p} alt="" className="w-full h-32 object-cover rounded-xl border border-zinc-700" />
                      <button type="button" onClick={() => removePhoto(i)} className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded-lg">X</button>
                    </div>
                  ))}
                </div>
              )}
              {photos.length < 5 && (
                <label className="cursor-pointer inline-block bg-black border border-zinc-700 hover:border-green-500 transition rounded-xl px-6 py-3 text-sm font-semibold text-gray-300">
                  Ajouter des photos
                  <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
                </label>
              )}
              <p className="text-gray-500 text-xs mt-2">{photos.length}/5 photos</p>
            </div>

            <div>
              <p className="text-gray-300 mb-3">Trace GPX (optionnel)</p>
              {gpxFile ? (
                <div className="flex items-center gap-4 bg-black border border-green-500 rounded-xl px-4 py-3">
                  <p className="text-green-400 text-sm flex-1">{gpxFile.name}</p>
                  <button type="button" onClick={() => setGpxFile(null)} className="text-red-400 text-sm">Supprimer</button>
                </div>
              ) : (
                <label className="cursor-pointer inline-block bg-black border border-zinc-700 hover:border-green-500 transition rounded-xl px-6 py-3 text-sm font-semibold text-gray-300">
                  Ajouter un fichier GPX
                  <input type="file" accept=".gpx" onChange={(e) => setGpxFile(e.target.files?.[0] || null)} className="hidden" />
                </label>
              )}
              <p className="text-gray-500 text-xs mt-2">Format .gpx — compatible Suunto, Garmin, Strava...</p>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full bg-green-500 hover:bg-green-600 transition px-8 py-4 rounded-xl font-semibold text-lg disabled:opacity-50">
            {submitting ? "Envoi en cours..." : "Soumettre la randonnée"}
          </button>
        </form>
      </section>
    </main>
  );
}
