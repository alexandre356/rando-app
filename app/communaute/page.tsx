"use client";

import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import PageHeader from "../../components/PageHeader";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Outing = {
  id: string;
  user_id: string;
  summit_id: string | null;
  title: string;
  description: string | null;
  date: string;
  conditions: string | null;
  video_url: string | null;
  ayvri_url: string | null;
  xcontest_url: string | null;
  created_at: string;
  profiles: { username: string | null; avatar_url: string | null } | null;
  summits: { name: string | null } | null;
};

type SuspenteWithProfile = {
  user_id: string;
  outing_id: string;
  profiles: { username: string | null; avatar_url: string | null } | null;
};

type Comment = {
  id: string;
  user_id: string;
  outing_id: string;
  content: string;
  created_at: string;
  username?: string | null;
  avatar_url?: string | null;
};

function getYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function isInstagram(url: string): boolean {
  return url.includes("instagram.com");
}

function getAyvriEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("ayvri.com")) return null;
    return url.replace("/replay", "/embed");
  } catch { return null; }
}

export default function CommunautePage() {
  const [outings, setOutings] = useState<Outing[]>([]);
  const [outingPhotos, setOutingPhotos] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [suspentes, setSuspentes] = useState<Record<string, number>>({});
  const [suspentesProfiles, setSuspentesProfiles] = useState<Record<string, SuspenteWithProfile[]>>({});
  const [userSuspentes, setUserSuspentes] = useState<Set<string>>(new Set());
  const [loadingSuspente, setLoadingSuspente] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [filterMassif, setFilterMassif] = useState("");
  const [filterSummitId, setFilterSummitId] = useState("");
  const [availableSummits, setAvailableSummits] = useState<Array<{id: string; name: string; massif: string | null}>>([]);
  const [showSuspentesFor, setShowSuspentesFor] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [showCommentsFor, setShowCommentsFor] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      setUserId(user?.id || null);

      const { data, error } = await supabase
        .from("outings")
        .select("*")
        .order("date", { ascending: false });

      if (error) { console.error(error); setLoading(false); return; }

      const outingsList = data || [];

      // Load profiles separately
      const userIds = [...new Set(outingsList.map((o: {user_id: string}) => o.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);
      const profilesMap: Record<string, { username: string | null; avatar_url: string | null }> = {};
      for (const p of profilesData || []) profilesMap[p.id] = p;

      // Load summits separately
      const summitIds = [...new Set(outingsList.filter((o: {summit_id: string | null}) => o.summit_id).map((o: {summit_id: string | null}) => o.summit_id as string))];
      const summitsMap: Record<string, { name: string | null }> = {};
      if (summitIds.length > 0) {
        const { data: summitsData } = await supabase
          .from("summits")
          .select("id, name")
          .in("id", summitIds);
        for (const s of summitsData || []) summitsMap[s.id] = s;
      }

      setOutings(outingsList.map((o: Outing) => ({
        ...o,
        profiles: profilesMap[o.user_id] || null,
        summits: o.summit_id ? summitsMap[o.summit_id] || null : null,
      })));

      // Load photos
      const photosMap: Record<string, string[]> = {};
      for (const outing of outingsList) {
        const { data: files } = await supabase.storage
          .from("outings")
          .list(outing.id, { sortBy: { column: "created_at", order: "asc" } });
        if (files && files.length > 0) {
          photosMap[outing.id] = files.map((f) =>
            supabase.storage.from("outings").getPublicUrl(`${outing.id}/${f.name}`).data.publicUrl
          );
        }
      }
      setOutingPhotos(photosMap);

      // Load suspentes with profiles
      const { data: suspentesData } = await supabase
        .from("suspentes")
        .select("outing_id, user_id, profiles(username, avatar_url)");

      const countMap: Record<string, number> = {};
      const suspentesProfilesMap: Record<string, SuspenteWithProfile[]> = {};
      const userSet = new Set<string>();

      for (const s of suspentesData || []) {
        countMap[s.outing_id] = (countMap[s.outing_id] || 0) + 1;
        if (!suspentesProfilesMap[s.outing_id]) suspentesProfilesMap[s.outing_id] = [];
        suspentesProfilesMap[s.outing_id].push(s as unknown as SuspenteWithProfile);
        if (user && s.user_id === user.id) userSet.add(s.outing_id);
      }

      setSuspentes(countMap);
      setSuspentesProfiles(suspentesProfilesMap);
      setUserSuspentes(userSet);

      // Load summits for filter
      const { data: summitsData } = await supabase.from("summits").select("id, name, massif").eq("status", "approved").order("name");
      setAvailableSummits(summitsData || []);

      setLoading(false);
    }
    load();
  }, []);

  async function toggleSuspente(outingId: string) {
    if (!userId) return;
    setLoadingSuspente(outingId);

    if (userSuspentes.has(outingId)) {
      await supabase.from("suspentes").delete().eq("outing_id", outingId).eq("user_id", userId);
      setUserSuspentes((prev) => { const s = new Set(prev); s.delete(outingId); return s; });
      setSuspentes((prev) => ({ ...prev, [outingId]: Math.max(0, (prev[outingId] || 1) - 1) }));
    } else {
      await supabase.from("suspentes").insert({ user_id: userId, outing_id: outingId });
      setUserSuspentes((prev) => new Set([...prev, outingId]));
      setSuspentes((prev) => ({ ...prev, [outingId]: (prev[outingId] || 0) + 1 }));
    }

    setLoadingSuspente(null);
  }

  async function loadComments(outingId: string) {
    const { data } = await supabase
      .from("outing_comments")
      .select("*")
      .eq("outing_id", outingId)
      .order("created_at", { ascending: true });

    const commentsList = data || [];
    const userIds = [...new Set(commentsList.map((c) => c.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);
    const profilesMap: Record<string, { username: string | null; avatar_url: string | null }> = {};
    for (const p of profilesData || []) profilesMap[p.id] = p;

    setComments((prev) => ({
      ...prev,
      [outingId]: commentsList.map((c) => ({
        ...c,
        username: profilesMap[c.user_id]?.username || "Pilote",
        avatar_url: profilesMap[c.user_id]?.avatar_url || null,
      })),
    }));
  }

  async function toggleComments(outingId: string) {
    if (showCommentsFor === outingId) {
      setShowCommentsFor(null);
    } else {
      setShowCommentsFor(outingId);
      if (!comments[outingId]) await loadComments(outingId);
    }
  }

  async function submitComment(outingId: string) {
    const content = newComment[outingId]?.trim();
    if (!content || !userId) return;
    setSubmittingComment(outingId);

    const { data, error } = await supabase
      .from("outing_comments")
      .insert({ user_id: userId, outing_id: outingId, content })
      .select("*")
      .single();

    if (!error && data) {
      const { data: profile } = await supabase.from("profiles").select("username, avatar_url").eq("id", userId).single();
      setComments((prev) => ({
        ...prev,
        [outingId]: [...(prev[outingId] || []), { ...data, username: profile?.username || "Pilote", avatar_url: profile?.avatar_url || null }],
      }));
      setNewComment((prev) => ({ ...prev, [outingId]: "" }));
    }
    setSubmittingComment(null);
  }

  async function deleteComment(outingId: string, commentId: string) {
    await supabase.from("outing_comments").delete().eq("id", commentId);
    setComments((prev) => ({
      ...prev,
      [outingId]: (prev[outingId] || []).filter((c) => c.id !== commentId),
    }));
  }

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

      <section className="p-5 sm:p-10">
        <PageHeader
          title="Communauté"
          tagline="Si tout le monde attend, attends. Si tout le monde décolle, attends aussi."
          taglineClassName="text-purple-400"
          action={
            isLoggedIn ? (
              <a href="/communaute/submit" className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold">
                + Partager une sortie
              </a>
            ) : undefined
          }
        />

        <p className="text-gray-400 mb-8">{outings.length} sortie(s) partagée(s)</p>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select value={filterMassif} onChange={(e) => { setFilterMassif(e.target.value); setFilterSummitId(""); setVisibleCount(10); }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm">
            <option value="">Tous les massifs</option>
            {[...new Set(availableSummits.map((s) => s.massif).filter(Boolean))].map((m) => (
              <option key={m} value={m!}>{m}</option>
            ))}
          </select>
          <select value={filterSummitId} onChange={(e) => { setFilterSummitId(e.target.value); setVisibleCount(10); }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm">
            <option value="">Tous les spots</option>
            {availableSummits.filter((s) => !filterMassif || s.massif === filterMassif).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {(filterMassif || filterSummitId) && (
            <button onClick={() => { setFilterMassif(""); setFilterSummitId(""); setVisibleCount(10); }}
              className="text-xs text-red-400 hover:text-red-300 border border-zinc-700 rounded-xl px-3 py-2">
              ✕ Réinitialiser
            </button>
          )}
        </div>

        {outings.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-xl mb-4">Aucune sortie partagée pour l&apos;instant.</p>
            {isLoggedIn ? (
              <a href="/communaute/submit" className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold">Soyez le premier !</a>
            ) : (
              <a href="/login" className="text-green-400 hover:underline">Connectez-vous pour partager une sortie</a>
            )}
          </div>
        ) : (
          (() => {
            const filtered = outings.filter((o) => {
              if (filterSummitId && o.summit_id !== filterSummitId) return false;
              if (filterMassif && o.summits?.name) {
                const summit = availableSummits.find((s) => s.id === o.summit_id);
                if (!summit || summit.massif !== filterMassif) return false;
              }
              return true;
            });
            const visible = filtered.slice(0, visibleCount);
            return (
              <>
                <div className="grid md:grid-cols-2 gap-8">
                  {visible.map((outing) => {
              const youtubeId = outing.video_url ? getYoutubeId(outing.video_url) : null;
              const isInsta = outing.video_url ? isInstagram(outing.video_url) : false;
              const photos = outingPhotos[outing.id] || [];
              const ayvriEmbed = outing.ayvri_url ? getAyvriEmbedUrl(outing.ayvri_url) : null;
              const hasSuspente = userSuspentes.has(outing.id);
              const suspentesCount = suspentes[outing.id] || 0;

              return (
                <div key={outing.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{outing.title}</h2>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                        <span>{new Date(outing.date).toLocaleDateString("fr-FR")}</span>
                        {outing.profiles?.username && <span>par <Link href={`/profile/${outing.user_id}`} className="text-white hover:text-green-400 transition">{outing.profiles.username}</Link></span>}
                        {outing.summits?.name && <span className="text-green-400">{outing.summits.name}</span>}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                      <button
                        onClick={() => toggleSuspente(outing.id)}
                        disabled={!isLoggedIn || loadingSuspente === outing.id}
                        title={isLoggedIn ? (hasSuspente ? "Retirer ma suspente" : "Donner une suspente") : "Connectez-vous pour réagir"}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition ${
                          hasSuspente
                            ? "bg-green-500 border-green-500 text-white"
                            : "bg-zinc-800 border-zinc-700 text-gray-300 hover:border-green-500"
                        } disabled:opacity-50`}
                      >
                        <span className="text-lg">🪂</span>
                        <span className="font-semibold text-sm">{suspentesCount}</span>
                      </button>

                      {suspentesCount > 0 && (
                        <button
                          onClick={() => setShowSuspentesFor(showSuspentesFor === outing.id ? null : outing.id)}
                          className="text-xs text-gray-500 hover:text-gray-300 transition"
                        >
                          {showSuspentesFor === outing.id ? "Masquer" : `Voir les ${suspentesCount} suspente${suspentesCount > 1 ? "s" : ""}`}
                        </button>
                      )}

                      {showSuspentesFor === outing.id && (suspentesProfiles[outing.id] || []).length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-end max-w-48">
                          {(suspentesProfiles[outing.id] || []).map((s) => (
                            <div key={s.user_id} className="flex items-center gap-1 bg-zinc-800 rounded-full px-2 py-1">
                              {s.profiles?.avatar_url ? (
                                <img src={s.profiles.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                              ) : (
                                <span className="text-xs">🪂</span>
                              )}
                              <span className="text-xs text-gray-300">{s.profiles?.username || "Pilote"}</span>
                            </div>
                          ))}
                        </div>
                      )}
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
                    <div className="grid grid-cols-3 gap-3 mb-4">
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
                    <a href={outing.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 transition px-5 py-3 rounded-xl font-semibold text-sm mb-4">
                      Voir sur Instagram
                    </a>
                  )}

                  {ayvriEmbed && (
                    <div className="mb-4">
                      <p className="text-gray-400 text-xs mb-2 font-semibold">Replay 3D — Ayvri</p>
                      <div className="w-full h-64 rounded-2xl overflow-hidden border border-zinc-700">
                        <iframe src={ayvriEmbed} width="100%" height="100%" frameBorder="0" allowFullScreen />
                      </div>
                    </div>
                  )}

                  {outing.xcontest_url && (
                    <a href={outing.xcontest_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-black border border-zinc-700 hover:border-green-500 transition rounded-xl px-4 py-3 text-sm mb-4">
                      <span className="text-green-400 font-semibold">Voir le vol sur XContest</span>
                      <span className="text-gray-500 text-xs">stats, trace, classement</span>
                    </a>
                  )}

                  {/* Partage */}
                  <div className="flex gap-2 mb-4">
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 transition rounded-xl px-3 py-2 text-xs font-semibold text-blue-200">
                      Facebook
                    </a>
                    <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${outing.title} - Marche&Plouf 🪂`)}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 transition rounded-xl px-3 py-2 text-xs font-semibold text-gray-200">
                      𝕏 Twitter
                    </a>
                    <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Lien copié !"); }}
                      className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 transition rounded-xl px-3 py-2 text-xs font-semibold text-gray-200">
                      🔗 Copier le lien
                    </button>
                  </div>

                  {/* Commentaires */}
                  <div className="border-t border-zinc-800 pt-4 mt-2">
                    <button
                      onClick={() => toggleComments(outing.id)}
                      className="text-sm text-gray-400 hover:text-white transition flex items-center gap-2"
                    >
                      💬 {comments[outing.id]?.length ?? ""} {showCommentsFor === outing.id ? "Masquer les commentaires" : "Commentaires"}
                    </button>

                    {showCommentsFor === outing.id && (
                      <div className="mt-4 space-y-3">
                        {(comments[outing.id] || []).map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                              {comment.avatar_url
                                ? <img src={comment.avatar_url} alt="" className="w-full h-full object-cover" />
                                : <span className="text-xs">🪂</span>
                              }
                            </div>
                            <div className="flex-1 bg-zinc-800 rounded-xl px-4 py-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold text-green-400">{comment.username}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">
                                    {new Date(comment.created_at).toLocaleDateString("fr-FR")}
                                  </span>
                                  {comment.user_id === userId && (
                                    <button onClick={() => deleteComment(outing.id, comment.id)} className="text-xs text-red-400 hover:text-red-300">✕</button>
                                  )}
                                </div>
                              </div>
                              <p className="text-gray-300 text-sm">{comment.content}</p>
                            </div>
                          </div>
                        ))}

                        {isLoggedIn ? (
                          <div className="flex gap-3">
                            <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                              <span className="text-xs">🪂</span>
                            </div>
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                placeholder="Ajouter un commentaire..."
                                value={newComment[outing.id] || ""}
                                onChange={(e) => setNewComment((prev) => ({ ...prev, [outing.id]: e.target.value }))}
                                onKeyDown={(e) => e.key === "Enter" && submitComment(outing.id)}
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-green-500"
                              />
                              <button
                                onClick={() => submitComment(outing.id)}
                                disabled={submittingComment === outing.id || !newComment[outing.id]?.trim()}
                                className="bg-green-500 hover:bg-green-600 transition px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                              >
                                Envoyer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-xs">
                            <a href="/login" className="text-green-400 hover:underline">Connectez-vous</a> pour commenter
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
                </div>
                {visible.length < filtered.length && (
                  <div className="text-center mt-8">
                    <button onClick={() => setVisibleCount((prev) => prev + 10)}
                      className="bg-zinc-900 border border-zinc-700 hover:border-green-500 transition px-8 py-3 rounded-xl font-semibold text-sm">
                      Charger {Math.min(10, filtered.length - visibleCount)} sortie(s) de plus
                    </button>
                    <p className="text-gray-500 text-xs mt-2">{visible.length}/{filtered.length} sorties affichées</p>
                  </div>
                )}
              </>
            );
          })()
        )}
      </section>
    </main>
  );
}
