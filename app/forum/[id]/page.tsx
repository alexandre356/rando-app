"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";

type Topic = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  username?: string;
};

type Reply = {
  id: string;
  user_id: string;
  topic_id: string;
  content: string;
  created_at: string;
  username?: string;
};

export default function TopicPage() {
  const { id } = useParams();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);

      const { data: topicData, error: topicError } = await supabase
        .from("forum_topics")
        .select("*")
        .eq("id", id)
        .single();

      if (topicError) { console.error(topicError); setLoading(false); return; }

      const { data: topicProfile } = await supabase.from("profiles").select("username").eq("id", topicData.user_id).single();
      setTopic({ ...topicData, username: topicProfile?.username || "Anonyme" });

      const { data: repliesData, error: repliesError } = await supabase
        .from("forum_replies")
        .select("*")
        .eq("topic_id", id)
        .order("created_at", { ascending: true });

      if (repliesError) { console.error(repliesError); setLoading(false); return; }

      const repliesWithUsernames = await Promise.all(
        (repliesData || []).map(async (reply) => {
          const { data: profile } = await supabase.from("profiles").select("username").eq("id", reply.user_id).single();
          return { ...reply, username: profile?.username || "Anonyme" };
        })
      );

      setReplies(repliesWithUsernames);
      setLoading(false);
    }

    if (id) load();
  }, [id]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("forum_replies")
      .insert({ user_id: user.id, topic_id: id, content })
      .select("*")
      .single();

    if (error) { alert(error.message); setSubmitting(false); return; }

    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
    setReplies([...replies, { ...data, username: profile?.username || "Anonyme" }]);
    setContent("");
    setSubmitting(false);
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

  if (!topic) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-400 text-xl">Discussion introuvable.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="p-10">
        <a href="/forum" className="text-gray-400 hover:text-green-400 transition mb-8 inline-block">
          &larr; Retour au forum
        </a>

        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-4xl font-bold">{topic.title}</h1>
          {topic.category && (
            <span className="text-xs bg-zinc-700 text-gray-300 px-3 py-1 rounded-full shrink-0">{topic.category}</span>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
          <p className="text-gray-300 leading-relaxed mb-4">{topic.content}</p>
          <div className="flex gap-4 text-xs text-gray-500">
            <span>par {topic.username}</span>
            <span>{new Date(topic.created_at).toLocaleDateString("fr-FR")}</span>
          </div>
        </div>

        {replies.length > 0 && (
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-bold text-gray-300">{replies.length} réponse(s)</h2>
            {replies.map((reply) => (
              <div key={reply.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <p className="text-gray-300 leading-relaxed mb-3">{reply.content}</p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="text-green-400">{reply.username}</span>
                  <span>{new Date(reply.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {isLoggedIn ? (
          <form onSubmit={handleReply} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold">Répondre</h2>
            <textarea
              placeholder="Votre réponse..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
              required
            />
            <button type="submit" disabled={submitting} className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold disabled:opacity-50">
              {submitting ? "Envoi..." : "Publier la réponse"}
            </button>
          </form>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-gray-400 mb-3">Connectez-vous pour répondre</p>
            <a href="/login" className="bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold">
              Se connecter
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
