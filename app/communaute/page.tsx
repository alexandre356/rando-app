"use client";

import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";

type Outing = {
  id: string;
  user_id: string;
  site_id: string | null;
  title: string;
  description: string | null;
  date: string;
  conditions: string | null;
  video_url: string | null;
  created_at: string;
  profiles: { username: string | null } | null;
  sites: { name: string | null; massif: string | null } | null;
};

function getYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function isInstagram(url: string): boolean {
  return url.includes("instagram.com");
}

export default function CommunautePage() {
  const [outings, setOutings] = useState<Outing[]>([]);
  const [outingPhotos, setOutingPhotos] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);

      const { data, error } = await supabase
        .from("outings")
        .select(`*, profiles ( username ), sites ( name, massif )`)
        .order("date", { ascending: false });

      if (error) { console.error(error); setLoading(false); return; }

      const outingsList = data || [];
      setOutings(outingsList);

      const photosMap: Record<string, string[]> = {};
      for (const outing of outingsList) {
        const { data: files } = await supabase.storage
          .from("outings")
          .list(outing.id, { sortBy: { column: "created_at", order: "asc" } });

        if (files && files.length > 0) {
          const urls = files.map((file) => {
            const { data: urlData } = supabase.storage.from("outings").getPublicUrl(`${outing.id}/${file.name}`);
            return urlData.publicUrl;
          });
          photosMap[outing.id] = urls;
        }
      }

      setOutingPhotos(photosMap);
      setLoading(false);
    }

    load();
  }, []);

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

      <section className="max-w-4xl mx-auto p-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-5xl font-bold">Communauté</h1>
          {isLoggedIn && (
            <a href="/communaute/submit" className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold">
              + Partager une sortie
            </a>
          )}
        </div>

        <p className="text-purple-400 italic text-sm mb-6">
          &ldquo;Si tout le monde attend, attends. Si tout le monde décolle, attends aussi.&rdquo;
        </p>

        <p className="text-gray-400 mb-8">{outings.length} sortie(s) partagée(s)</p>

        {outings.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-xl mb-4">Aucune sortie partagée pour l'instant.</p>
            {isLoggedIn ? (
              <a href="/communaute/submit" className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold">
                Soyez le premier !
              </a>
            ) : (
              <a href="/login" className="text-green-400 hover:underline">Connectez-vous pour partager une sortie</a>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {outings.map((outing) => {
              const youtubeId = outing.video_url ? getYoutubeId(outing.video_url) : null;
              const isInsta = outing.video_url ? isInstagram(outing.video_url) : false;
              const photos = outingPhotos[outing.id] || [];

              return (
                <div key={outing.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{outing.title}</h2>
                      <div className="flex gap-4 text-sm text-gray-400">
                        <span>{new Date(outing.date).toLocaleDateString("fr-FR")}</span>
                        {outing.profiles?.username && <span>par {outing.profiles.username}</span>}
                        {outing.sites?.name && <span className="text-green-400">{outing.sites.name}</span>}
                      </div>
                    </div>
                  </div>

                  {outing.conditions && (
                    <div className="bg-black rounded-xl px-4 py-3 mb-4 text-sm">
                      <span className="text-gray-400">Conditions : </span>
                      <span className="text-gray-200">{outing.conditions}</span>
                    </div>
                  )}

                  {outing.description && <p className="text-gray-300 leading-relaxed mb-4">{outing.description}</p>}

                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      {photos.map((url, index) => (
                        <img key={index} src={url} alt={`Photo ${index + 1}`} className="w-full h-40 object-cover rounded-xl border border-zinc-800" />
                      ))}
                    </div>
                  )}

                  {youtubeId && (
                    <div className="rounded-2xl overflow-hidden aspect-video mb-4">
                      <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${youtubeId}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                  )}

                  {isInsta && outing.video_url && (
                    <a href={outing.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 transition px-5 py-3 rounded-xl font-semibold text-sm">
                      Voir sur Instagram
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
