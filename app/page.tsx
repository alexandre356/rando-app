"use client";

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    }
    checkUser();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoginError("Email ou mot de passe incorrect.");
      setLoggingIn(false);
      return;
    }

    window.location.reload();
  }

  return (
    <main className="relative min-h-screen text-white overflow-hidden">

      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/mountain.jpg')" }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Navbar */}
      <div className="relative z-20">
        <Navbar />
      </div>

      {/* Hero content */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-5 sm:px-6 py-10">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-5 sm:mb-6 leading-tight">
          Explore la montagne autrement
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-gray-200 max-w-2xl mb-8 sm:mb-10">
          La communauté Hike &amp; Fly — topos, spots de vol, sorties et carnet de vol, partagés entre pilotes de parapente.
        </p>

        <div className="flex flex-col items-center gap-5 w-full max-w-xs sm:max-w-sm">
          {isLoggedIn === true && (
            <a
              href="/map"
              className="bg-green-500 hover:bg-green-600 transition px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl text-base sm:text-lg font-semibold w-full"
            >
              Découvrir les randonnées
            </a>
          )}

          {/* Connexion directe si déconnecté */}
          {isLoggedIn === false && (
            <form onSubmit={handleLogin} className="w-full space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full bg-black/70 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
                required
              />
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-black/70 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
                required
              />

              {loginError && <p className="text-red-400 text-sm">{loginError}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="flex-1 bg-zinc-800 border border-zinc-600 hover:border-green-500 transition px-4 py-3 rounded-xl font-semibold disabled:opacity-50"
                >
                  {loggingIn ? "Connexion..." : "Connexion"}
                </button>

                <a
                  href="/signup"
                  className="flex-1 bg-zinc-800 border border-zinc-600 hover:border-green-500 transition px-4 py-3 rounded-xl font-semibold text-center"
                >
                  Inscription
                </a>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
