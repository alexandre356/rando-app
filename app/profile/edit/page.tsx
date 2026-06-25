"use client";

import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";
import { useEffect, useState } from "react";

export default function EditProfilePage() {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [wing, setWing] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [favoriteSpot, setFavoriteSpot] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!data) return;

      setUsername(data.username || "");
      setBio(data.bio || "");
      setWing(data.wing || "");
      setLocation(data.location || "");
      setExperience(data.experience || "");
      setFavoriteSpot(data.favorite_spot || "");
    }

    loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        username,
        bio,
        wing,
        location,
        experience,
        favorite_spot: favoriteSpot,
      })
      .eq("id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Profil enregistré !");
    window.location.href = "/profile";
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="max-w-3xl mx-auto p-10">
        <h1 className="text-5xl font-bold mb-8">
          Modifier le profil
        </h1>

        <form
          onSubmit={handleSave}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6"
        >
          <input
            type="text"
            placeholder="Pseudo"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <textarea
            placeholder="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <input
            type="text"
            placeholder="Voile"
            value={wing}
            onChange={(e) => setWing(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <input
            type="text"
            placeholder="Région"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <input
            type="text"
            placeholder="Niveau"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <input
            type="text"
            placeholder="Spot préféré"
            value={favoriteSpot}
            onChange={(e) => setFavoriteSpot(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 transition px-8 py-4 rounded-xl font-semibold"
          >
            Enregistrer
          </button>
        </form>
      </section>
    </main>
  );
}