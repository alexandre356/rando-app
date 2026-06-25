"use client";

import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";
import { useEffect, useState, useRef } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

type Site = {
  id: string;
  name: string;
  massif: string | null;
  orientation: string | null;
  elevation_gain: number | null;
  min_glide_ratio: number | null;
  latitude: number | null;
  longitude: number | null;
};

type GeocodingResult = {
  place_name: string;
  center: [number, number];
};

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const [viewState, setViewState] = useState({
    longitude: 6.5,
    latitude: 45.5,
    zoom: 7,
  });

  const [search, setSearch] = useState("");
  const [massif, setMassif] = useState("");
  const [orientation, setOrientation] = useState("");
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

  useEffect(() => {
    async function loadSites() {
      const { data, error } = await supabase
        .from("sites")
        .select("id, name, massif, orientation, elevation_gain, min_glide_ratio, latitude, longitude")
        .eq("status", "approved");

      if (error) {
        console.error(error);
        return;
      }

      setSites(data || []);
    }

    loadSites();
  }, []);

  function handleLocate() {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserPosition({ lat: latitude, lng: longitude });
        setUseRadius(true);
        setPositionLabel("Ma position");
        setCitySearch("");
        setViewState({ latitude, longitude, zoom: 9 });
        setLocating(false);
      },
      () => {
        alert("Impossible d'obtenir votre position.");
        setLocating(false);
      }
    );
  }

  async function handleCitySearch(value: string) {
    setCitySearch(value);
    setShowSuggestions(true);

    if (citySearchTimeout.current) clearTimeout(citySearchTimeout.current);

    if (value.length < 2) {
      setCitySuggestions([]);
      return;
    }

    citySearchTimeout.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${token}&country=fr&types=place,locality&language=fr`
      );
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

  function handleDisableRadius() {
    setUseRadius(false);
    setUserPosition(null);
    setPositionLabel("");
    setCitySearch("");
  }

  const filteredSites = sites.filter((site) => {
    const matchesSearch = site.name.toLowerCase().includes(search.toLowerCase());
    const matchesMassif = massif === "" || site.massif === massif;
    const matchesOrientation = orientation === "" || (site.orientation || "").includes(orientation);
    const elevation = site.elevation_gain ?? 0;
    const matchesElevation = elevation >= minElevation && elevation <= maxElevation;

    const hasCoordinates =
      site.latitude !== null &&
      site.longitude !== null &&
      site.latitude >= -90 &&
      site.latitude <= 90 &&
      site.longitude >= -180 &&
      site.longitude <= 180;

    const matchesRadius =
      !useRadius ||
      !userPosition ||
      !hasCoordinates ||
      getDistanceKm(userPosition.lat, userPosition.lng, site.latitude!, site.longitude!) <= radius;

    return matchesSearch && matchesMassif && matchesOrientation && matchesElevation && hasCoordinates && matchesRadius;
  });

  function focusOnSite(site: Site) {
    if (site.latitude === null || site.longitude === null) return;
    setSelectedSite(site);
    setViewState({ longitude: site.longitude, latitude: site.latitude, zoom: 11 });
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-1">Carte Hike &amp; Fly</h1>
            <p className="text-orange-400 italic text-xs">&ldquo;Quand les mouettes reculent, réfléchis. Quand les buses reculent, cours. Quand les vautours reculent, range tout.&rdquo;</p>
          </div>
          <a
            href="/submit-site"
            className="bg-green-500 hover:bg-green-600 transition px-5 py-3 rounded-xl font-semibold text-sm"
          >
            + Ajouter un site
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Recherche par nom"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm"
          />

          <select
            value={massif}
            onChange={(e) => setMassif(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm"
          >
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
            <option value="Queyras - Alpes Cozie N">Queyras - Alpes Cozie N</option>
            <option value="Mercantour">Mercantour</option>
            <option value="Jura">Jura</option>
            <option value="Massif Central">Massif Central</option>
            <option value="Vosges">Vosges</option>
            <option value="Corse">Corse</option>
          </select>

          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm"
          >
            <option value="">Toutes orientations</option>
            <option value="N">N</option>
            <option value="NE">NE</option>
            <option value="E">E</option>
            <option value="SE">SE</option>
            <option value="S">S</option>
            <option value="SO">SO</option>
            <option value="O">O</option>
            <option value="NO">NO</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400 text-sm">D+ minimum</span>
              <span className="text-green-400 font-semibold text-sm">{minElevation} m</span>
            </div>
            <input
              type="range"
              min={0}
              max={5000}
              step={50}
              value={minElevation}
              onChange={(e) => setMinElevation(Number(e.target.value))}
              className="w-full accent-green-500"
            />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400 text-sm">D+ maximum</span>
              <span className="text-green-400 font-semibold text-sm">{maxElevation} m</span>
            </div>
            <input
              type="range"
              min={0}
              max={5000}
              step={50}
              value={maxElevation}
              onChange={(e) => setMaxElevation(Number(e.target.value))}
              className="w-full accent-green-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={handleLocate}
            disabled={locating}
            className={`px-5 py-2 rounded-xl font-semibold transition text-sm ${
              useRadius && positionLabel === "Ma position"
                ? "bg-green-500 text-white"
                : "bg-zinc-900 border border-zinc-700 hover:border-green-500 text-gray-300"
            } disabled:opacity-50`}
          >
            {locating ? "Localisation..." : "Ma position"}
          </button>

          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Recherche par ville..."
              value={citySearch}
              onChange={(e) => handleCitySearch(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              className="w-full bg-zinc-900 border border-zinc-700 hover:border-green-500 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
            {showSuggestions && citySuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-50">
                {citySuggestions.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectCity(result)}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-700 text-sm text-gray-200 border-b border-zinc-700 last:border-0"
                  >
                    {result.place_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {useRadius && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm shrink-0">Rayon :</span>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-32 accent-green-500"
                />
                <span className="text-green-400 font-semibold text-sm shrink-0 w-16">
                  {radius} km
                </span>
              </div>

              <button
                onClick={handleDisableRadius}
                className="text-xs text-red-400 hover:text-red-300 transition"
              >
                Désactiver
              </button>
            </>
          )}
        </div>

        {useRadius && positionLabel && (
          <p className="text-green-400 text-sm mb-2">
            Autour de : {positionLabel} — rayon {radius} km
          </p>
        )}

        <p className="text-gray-400 text-sm mb-4">
          {filteredSites.length} site(s) trouvé(s)
        </p>

        <div className="flex gap-6 h-[calc(100vh-500px)] min-h-[500px]">
          <div className="flex-1 rounded-2xl overflow-hidden border border-zinc-800">
            <Map
              {...viewState}
              onMove={(event) => setViewState(event.viewState)}
              mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
              mapStyle="mapbox://styles/mapbox/outdoors-v12"
              style={{ width: "100%", height: "100%" }}
              maxBounds={[[-5.5, 41.0], [10.0, 51.5]]}
            >
              {userPosition && (
                <Marker longitude={userPosition.lng} latitude={userPosition.lat} anchor="center">
                  <div className="w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-lg" />
                </Marker>
              )}

              {filteredSites.map((site) => (
                <Marker
                  key={site.id}
                  longitude={site.longitude!}
                  latitude={site.latitude!}
                  anchor="bottom"
                >
                  <button onClick={() => focusOnSite(site)} className="text-2xl">
                    📍
                  </button>
                </Marker>
              ))}

              {selectedSite &&
                selectedSite.latitude !== null &&
                selectedSite.longitude !== null && (
                  <Popup
                    longitude={selectedSite.longitude}
                    latitude={selectedSite.latitude}
                    onClose={() => setSelectedSite(null)}
                    closeOnClick={false}
                  >
                    <div className="text-black">
                      <h2 className="font-bold text-base">{selectedSite.name}</h2>
                      <p className="text-sm">Massif : {selectedSite.massif}</p>
                      <p className="text-sm">Orientation : {selectedSite.orientation}</p>
                      <p className="text-sm">D+ : {selectedSite.elevation_gain ?? "?"} m</p>
                      <a
                        href={`/site/${selectedSite.id}`}
                        className="text-green-600 font-semibold mt-2 block hover:underline text-sm"
                      >
                        Voir la fiche
                      </a>
                    </div>
                  </Popup>
                )}
            </Map>
          </div>

          <div className="w-80 overflow-y-auto space-y-3 pr-1">
            {filteredSites.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
                <p className="text-gray-400">Aucun site trouvé</p>
              </div>
            ) : (
              filteredSites.map((site) => (
                <div
                  key={site.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-green-500 transition cursor-pointer"
                  onClick={() => focusOnSite(site)}
                >
                  <h2 className="text-lg font-bold mb-1">{site.name}</h2>
                  <p className="text-gray-400 text-sm">{site.massif || "Non renseigné"}</p>
                  <p className="text-gray-400 text-sm">Orientation : {site.orientation || "?"}</p>
                  <p className="text-gray-400 text-sm">D+ : {site.elevation_gain ?? "?"} m</p>

                  {userPosition && site.latitude && site.longitude && (
                    <p className="text-green-400 text-xs mt-1">
                      {Math.round(getDistanceKm(userPosition.lat, userPosition.lng, site.latitude, site.longitude))} km
                      {positionLabel ? ` de ${positionLabel}` : " de vous"}
                    </p>
                  )}

                  <a
                    href={`/site/${site.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-green-400 hover:text-green-300 text-xs mt-2 inline-block"
                  >
                    Voir la fiche
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
