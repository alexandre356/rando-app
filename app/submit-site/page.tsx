"use client";

import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";
import { useState } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const massifs = [
  "Bornes - Aravis",
  "Chablais - Faucigny",
  "Haut Giffre - Aiguilles Rouges",
  "Mont Blanc",
  "Bauges",
  "Beaufortain",
  "Vanoise",
  "Belledonne",
  "Chartreuse",
  "Vercors",
  "Ecrins",
  "Queyras - Alpes Cozie N",
  "Mercantour - Alpes Maritimes Italiennes",
  "Jura",
  "Massif Central",
  "Vosges",
  "Corse",
];

const orientationsList = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

export default function SubmitSitePage() {
  const [name, setName] = useState("");
  const [massif, setMassif] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [takeoffName, setTakeoffName] = useState("");
  const [landingName, setLandingName] = useState("");
  const [orientations, setOrientations] = useState<string[]>([]);
  const [minGlideRatio, setMinGlideRatio] = useState("");
  const [elevationGain, setElevationGain] = useState("");
  const [danger, setDanger] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [viewState, setViewState] = useState({
    longitude: 6.5,
    latitude: 45.5,
    zoom: 7,
  });

  function toggleOrientation(orientation: string) {
    if (orientations.includes(orientation)) {
      setOrientations(orientations.filter((item) => item !== orientation));
    } else {
      setOrientations([...orientations, orientation]);
    }
  }

  function handleMapClick(event: { lngLat: { lat: number; lng: number } }) {
    const { lat, lng } = event.lngLat;
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newPhotos = [...photos, ...files].slice(0, 5);
    setPhotos(newPhotos);
    const newPreviews = newPhotos.map((file) => URL.createObjectURL(file));
    setPreviews(newPreviews);
  }

  function removePhoto(index: number) {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPreviews(newPreviews);
  }

  function handleGpxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".gpx")) {
      alert("Veuillez choisir un fichier .gpx");
      return;
    }
    setGpxFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!latitude || !longitude) {
      alert("Veuillez placer le décollage sur la carte en cliquant dessus.");
      return;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (lat < 41 || lat > 51.5 || lng < -5.5 || lng > 10) {
      alert("Coordonnées invalides. Veuillez cliquer sur la carte.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Vous devez être connecté.");
      return;
    }

    setSubmitting(true);

    const { data: siteData, error: siteError } = await supabase
      .from("sites")
      .insert({
        user_id: user.id,
        name,
        massif,
        description,
        latitude: lat,
        longitude: lng,
        takeoff_name: takeoffName,
        landing_name: landingName,
        orientation: orientations.join(","),
        min_glide_ratio: minGlideRatio ? Number(minGlideRatio) : null,
        elevation_gain: elevationGain ? Number(elevationGain) : null,
        danger,
        status: "pending",
      })
      .select()
      .single();

    if (siteError) {
      alert(siteError.message);
      setSubmitting(false);
      return;
    }

    if (photos.length > 0 && siteData) {
      for (const photo of photos) {
        const fileName = `${Date.now()}-${photo.name}`;
        await supabase.storage
          .from("sites")
          .upload(`${siteData.id}/${fileName}`, photo);
      }
    }

    if (gpxFile && siteData) {
      const fileName = `${Date.now()}-${gpxFile.name}`;
      await supabase.storage
        .from("gpx")
        .upload(`${siteData.id}/${fileName}`, gpxFile);
    }

    alert("Site soumis ! Il sera visible apres validation.");
    window.location.href = "/map";
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="max-w-4xl mx-auto p-10">
        <h1 className="text-5xl font-bold mb-4">Ajouter un site Hike and Fly</h1>
        <p className="text-rose-400 italic text-sm mb-8">&ldquo;Une voile pliée ne ferme jamais.&rdquo;</p>

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6"
        >
          <input
            type="text"
            placeholder="Nom du site"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            required
          />

          <select
            value={massif}
            onChange={(e) => setMassif(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            required
          >
            <option value="">Choisir un massif</option>
            {massifs.map((massifName) => (
              <option key={massifName} value={massifName}>
                {massifName}
              </option>
            ))}
          </select>

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <div>
            <p className="text-gray-300 mb-2">
              Cliquez sur la carte pour placer le décollage
            </p>

            {latitude && longitude ? (
              <p className="text-green-400 text-sm mb-3">
                Position selectionnée : {latitude}, {longitude}
              </p>
            ) : (
              <p className="text-yellow-500 text-sm mb-3">
                Aucune position selectionnée
              </p>
            )}

            <div className="w-full h-72 rounded-2xl overflow-hidden border border-zinc-700">
              <Map
                {...viewState}
                onMove={(event) => setViewState(event.viewState)}
                onClick={handleMapClick}
                mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                mapStyle="mapbox://styles/mapbox/outdoors-v12"
                style={{ width: "100%", height: "100%" }}
                cursor="crosshair"
                maxBounds={[
                  [-5.5, 41.0],
                  [10.0, 51.5],
                ]}
              >
                {latitude && longitude && (
                  <Marker
                    longitude={Number(longitude)}
                    latitude={Number(latitude)}
                    anchor="bottom"
                  >
                    <span className="text-3xl">📍</span>
                  </Marker>
                )}
              </Map>
            </div>
          </div>

          <input
            type="text"
            placeholder="Nom du décollage"
            value={takeoffName}
            onChange={(e) => setTakeoffName(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <input
            type="text"
            placeholder="Nom de l'atterrissage"
            value={landingName}
            onChange={(e) => setLandingName(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <div>
            <p className="text-gray-300 mb-3">Orientations du décollage</p>
            <div className="grid grid-cols-4 gap-3">
              {orientationsList.map((orientation) => (
                <button
                  key={orientation}
                  type="button"
                  onClick={() => toggleOrientation(orientation)}
                  className={`rounded-xl border px-4 py-3 transition ${
                    orientations.includes(orientation)
                      ? "bg-green-500 border-green-500 text-white"
                      : "bg-black border-zinc-700 text-gray-300 hover:border-green-500"
                  }`}
                >
                  {orientation}
                </button>
              ))}
            </div>
          </div>

          <select
            value={minGlideRatio}
            onChange={(e) => setMinGlideRatio(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          >
            <option value="">Finesse minimale</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((ratio) => (
              <option key={ratio} value={ratio}>
                {ratio}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="D+ en mètres"
            value={elevationGain}
            onChange={(e) => setElevationGain(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <textarea
            placeholder="Dangers / remarques"
            value={danger}
            onChange={(e) => setDanger(e.target.value)}
            rows={4}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <div>
            <p className="text-gray-300 mb-3">
              Photos du site (5 maximum)
            </p>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-xl border border-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded-lg"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < 5 && (
              <label className="cursor-pointer inline-block bg-black border border-zinc-700 hover:border-green-500 transition rounded-xl px-6 py-3 text-sm font-semibold text-gray-300">
                Ajouter des photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}

            <p className="text-gray-500 text-xs mt-2">
              {photos.length}/5 photos
            </p>
          </div>

          <div>
            <p className="text-gray-300 mb-3">
              Trace GPX (optionnel)
            </p>

            {gpxFile ? (
              <div className="flex items-center gap-4 bg-black border border-green-500 rounded-xl px-4 py-3">
                <p className="text-green-400 text-sm flex-1">{gpxFile.name}</p>
                <button
                  type="button"
                  onClick={() => setGpxFile(null)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Supprimer
                </button>
              </div>
            ) : (
              <label className="cursor-pointer inline-block bg-black border border-zinc-700 hover:border-green-500 transition rounded-xl px-6 py-3 text-sm font-semibold text-gray-300">
                Ajouter un fichier GPX
                <input
                  type="file"
                  accept=".gpx"
                  onChange={handleGpxChange}
                  className="hidden"
                />
              </label>
            )}

            <p className="text-gray-500 text-xs mt-2">
              Format .gpx uniquement
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-500 hover:bg-green-600 transition px-8 py-4 rounded-xl font-semibold text-lg disabled:opacity-50"
          >
            {submitting ? "Envoi en cours..." : "Soumettre le site"}
          </button>
        </form>
      </section>
    </main>
  );
}
