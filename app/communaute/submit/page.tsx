"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";

type Summit = {
  id: string;
  name: string;
  massif: string | null;
};

export default function SubmitOutingPage() {
  const router = useRouter();
  const [summits, setSummits] = useState<Summit[]>([]);
  const [title, setTitle] = useState("");
  const [summitId, setSummitId] = useState("");
  const [date, setDate] = useState("");
  const [conditions, setConditions] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [ayvriUrl, setAyvriUrl] = useState("");
  const [xcontestUrl, setXcontestUrl] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
    }
    async function loadSummits() {
      const { data } = await supabase
        .from("summits")
        .select("id, name, massif")
        .eq("status", "approved")
        .order("name");
      setSummits(data || []);
    }
    checkAuth();
    loadSummits();
  }, []);

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
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: outingData, error } = await supabase
      .from("outings")
      .insert({
        user_id: user.id,
        summit_id: summitId || null,
        title,
        date,
        conditions: conditions || null,
        description: description || null,
        video_url: videoUrl || null,
        ayvri_url: ayvriUrl || null,
        xcontest_url: xcontestUrl || null,
      })
      .select()
      .single();

    if (error) { alert(error.message); setSubmitting(false); return; }

    for (const photo of photos) {
      const fileName = `${Date.now()}-${photo.name}`;
      await supabase.storage.from("outings").upload(`${outingData.id}/${fileName}`, photo);
    }

    router.push("/communaute");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="p-10">
        <a href="/communaute" className="text-gray-400 hover:text-green-400 transition mb-8 inline-block">
          &larr; Retour à la communauté
        </a>

        <h1 className="text-5xl font-bold mb-4">Partager une sortie</h1>
        <p className="text-cyan-400 italic text-sm mb-8">&ldquo;Tout dans le vario, rien dans le ciboulot.&rdquo;</p>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
          <input type="text" placeholder="Titre de la sortie" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" required />

          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" required />

          <select value={summitId} onChange={(e) => setSummitId(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3">
            <option value="">Spot associé (optionnel)</option>
            {summits.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.massif ? ` — ${s.massif}` : ""}</option>
            ))}
          </select>

          <input type="text" placeholder="Conditions (vent, météo...)" value={conditions}
            onChange={(e) => setConditions(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" />

          <textarea placeholder="Récit de la sortie" value={description} onChange={(e) => setDescription(e.target.value)}
            rows={6} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" />

          <div>
            <p className="text-gray-300 mb-2">Lien vidéo (YouTube ou Instagram)</p>
            <input type="text" placeholder="https://youtube.com/... ou https://instagram.com/..." value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-300 mb-2">Trace Ayvri (replay 3D)</p>
              <input type="text" placeholder="https://ayvri.com/scene/xxxx/replay" value={ayvriUrl}
                onChange={(e) => setAyvriUrl(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" />
              <p className="text-gray-600 text-xs mt-1">Uploadez votre trace sur ayvri.com puis collez le lien</p>
            </div>
            <div>
              <p className="text-gray-300 mb-2">Lien XContest</p>
              <input type="text" placeholder="https://www.xcontest.org/world/en/flights/detail:..." value={xcontestUrl}
                onChange={(e) => setXcontestUrl(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" />
              <p className="text-gray-600 text-xs mt-1">Lien vers votre vol sur xcontest.org</p>
            </div>
          </div>

          <div>
            <p className="text-gray-300 mb-3">Photos (5 maximum)</p>
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {previews.map((p, i) => (
                  <div key={i} className="relative">
                    <img src={p} alt="" className="w-full h-32 object-cover rounded-xl border border-zinc-700" />
                    <button type="button" onClick={() => removePhoto(i)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded-lg">X</button>
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

          <button type="submit" disabled={submitting}
            className="w-full bg-green-500 hover:bg-green-600 transition px-8 py-4 rounded-xl font-semibold text-lg disabled:opacity-50">
            {submitting ? "Envoi en cours..." : "Publier la sortie"}
          </button>
        </form>
      </section>
    </main>
  );
}
