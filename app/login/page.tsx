"use client";

import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/map";
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="p-10 max-w-md mx-auto">
        <h1 className="text-5xl font-bold mb-8">
          Connexion
        </h1>

        <form
          onSubmit={handleLogin}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6"
        >
          <input
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 transition px-6 py-3 rounded-xl font-semibold"
          >
            Se connecter
          </button>
        </form>
      </section>
    </main>
  );
}