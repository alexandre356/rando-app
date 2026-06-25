"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";

type Site = {
  id: string;
  name: string;
  massif: string | null;
};

export default function SubmitOutingPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [title, setTitle] = useState("");
  const [siteId, setSiteId] = useState("");
  const [date, setDate] = useState("");
  const [conditions, setConditions] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
    }

    async function loadSites() {
      const { data } = await supabase
        .from("sites")
        .select("id, name, massif")
        .eq("status", "approved")
        .order("name");
      setSites(data || []);
    }

    checkAuth();
    loadSites();
  }, []);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: outingData, error } = await supabase
      .from("outings")
      .insert({
        user_id: user.id,
        site_id: siteId || null,
        title,
        date,
        conditions: conditions || null,
        description: description || null,
        video_url: videoUrl || null,
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      setSubmitting(false);
      return;
    }

    if (photos.length > 0 && outingData) {
      for (const photo of photos) {
        const fileName = `${Date.now()}-${photo.name}`;
        await supabase.storage
          .from("outings")
          .upload(`${outingData.id}/${fileName}`, photo);
      }
    }

    router.push("/communaute");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="max-w-4xl mx-auto p-10">
        <a
          href="/communaute"
          className="text-gray-400 hover:text-green-400 transition mb-8 inline-block"
        >
          &larr; Retour à la communauté
        </a>

        <h1 className="text-5xl font-bold mb-4">Partager une sortie</h1>
        <p className="text-cyan-400 italic text-sm mb-8">&ldquo;Tout dans le vario, rien dans le ciboulot.&rdquo;</p>

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6"
        >
          <input
            type="text"
            placeholder="Titre de la sortie"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            required
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            required
          />

          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          >
            <option value="">Site associé (optionnel)</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} {site.massif ? `— ${site.massif}` : ""}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Conditions (vent, météo...)"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <textarea
            placeholder="Récit de la sortie"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <div>
            <p className="text-gray-300 mb-2">
              Lien vidéo (YouTube ou Instagram)
            </p>
            <input
              type="text"
              placeholder="https://youtube.com/... ou https://instagram.com/..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <p className="text-gray-300 mb-3">Photos (5 maximum)</p>

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

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-500 hover:bg-green-600 transition px-8 py-4 rounded-xl font-semibold text-lg disabled:opacity-50"
          >
            {submitting ? "Envoi en cours..." : "Publier la sortie"}
          </button>
        </form>
      </section>
    </main>
  );
}
