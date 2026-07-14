"use client";

import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import PageHeader from "../../components/PageHeader";
import { supabase } from "../../lib/supabase";

const CATEGORIES = [
  "💡 Suggestions",
  "Météo et conditions",
  "Equipement vol",
  "Sites et spots",
  "Technique de vol",
  "Débutants",
  "Divers",
];

type Topic = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  username?: string;
};

export default function ForumPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Divers");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);

      const { data, error } = await supabase
        .from("forum_topics")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) { console.error(error); setLoading(false); return; }

      const topicsList = data || [];
      const topicsWithUsernames = await Promise.all(
        topicsList.map(async (topic) => {
          const { data: profile } = await supabase.from("profiles").select("username").eq("id", topic.user_id).single();
          return { ...topic, username: profile?.username || "Anonyme" };
        })
      );

      setTopics(topicsWithUsernames);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("forum_topics")
      .insert({ user_id: user.id, title, content, category })
      .select("*")
      .single();

    if (error) { alert(error.message); setSubmitting(false); return; }

    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
    setTopics([{ ...data, username: profile?.username || "Anonyme" }, ...topics]);
    setTitle(""); setContent(""); setCategory("Divers");
    setShowForm(false); setSubmitting(false);
  }

  const filteredTopics = activeCategory === "Tous" ? topics : topics.filter((t) => t.category === activeCategory);

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
          title="Forum"
          tagline="Si ça vole pas, cours plus vite."
          taglineClassName="text-yellow-400"
          action={
            isLoggedIn && !showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold"
              >
                + Nouvelle discussion
              </button>
            ) : undefined
          }
        />

        <p className="text-gray-400 mb-6">{filteredTopics.length} discussion(s)</p>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 -mx-5 px-5 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {["Tous", ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap shrink-0 ${
                activeCategory === cat
                  ? "bg-green-500 text-white"
                  : "bg-zinc-900 border border-zinc-700 text-gray-300 hover:border-green-500"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-zinc-900 border border-green-500 rounded-2xl p-5 sm:p-6 mb-8 space-y-4">
            <h2 className="text-xl font-bold">Nouvelle discussion</h2>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3">
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <input type="text" placeholder="Titre de la discussion" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" required />
            <textarea placeholder="Contenu de votre message..." value={content} onChange={(e) => setContent(e.target.value)} rows={5} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3" required />
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button type="submit" disabled={submitting} className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold disabled:opacity-50">
                {submitting ? "Envoi..." : "Publier"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-zinc-700 hover:bg-zinc-600 transition px-6 py-3 rounded-xl font-semibold">
                Annuler
              </button>
            </div>
          </form>
        )}

        {filteredTopics.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-10 text-center">
            <p className="text-gray-400 text-lg sm:text-xl mb-4">Aucune discussion dans cette catégorie.</p>
            {isLoggedIn && (
              <button onClick={() => setShowForm(true)} className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold">
                Lancez la première discussion !
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTopics.map((topic) => (
              <a key={topic.id} href={`/forum/${topic.id}`} className="block bg-zinc-900 border border-zinc-800 hover:border-green-500 transition rounded-2xl p-5 sm:p-6">
                <div className="flex flex-col-reverse sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                  <h2 className="text-lg sm:text-xl font-bold">{topic.title}</h2>
                  <span className="text-xs bg-zinc-700 text-gray-300 px-3 py-1 rounded-full self-start sm:ml-4 shrink-0">{topic.category || "Divers"}</span>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2 mb-3">{topic.content}</p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>par {topic.username}</span>
                  <span>{new Date(topic.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
              </a>
            ))}
          </div>
        )}

        <button
          onClick={() => { setActiveCategory("💡 Suggestions"); setShowForm(true); setCategory("💡 Suggestions"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="w-full bg-gradient-to-r from-amber-950 to-yellow-950 border border-amber-600 hover:border-amber-400 transition rounded-2xl p-5 mt-8 text-left flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-amber-400 font-bold text-base sm:text-lg">💡 Une idée pour améliorer Marche&amp;Plouf ?</p>
            <p className="text-gray-400 text-sm mt-1">Propose ta suggestion, on lit tout !</p>
          </div>
          <span className="text-amber-400 text-2xl shrink-0">→</span>
        </button>
      </section>
    </main>
  );
}