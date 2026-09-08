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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const [stats, setStats] = useState({ summits: 0, outings: 0, users: 0 });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);

      const [{ count: summitsCount }, { count: outingsCount }, { count: usersCount }] = await Promise.all([
        supabase.from("summits").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("outings").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        summits: summitsCount || 0,
        outings: outingsCount || 0,
        users: usersCount || 0,
      });
    }
    load();
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

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setSendingReset(true);
    setResetMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setResetMessage("Une erreur est survenue. Vérifiez l'adresse email.");
    } else {
      setResetMessage("Email envoyé ! Vérifiez votre boîte de réception.");
    }
    setSendingReset(false);
  }

  return (
    <main className="relative min-h-screen text-white overflow-hidden">

      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/mountain.jpg')" }}
      />

      {/* Voile turquoise foncé (palette, pas de noir) */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#14504C]/90 via-[#14504C]/55 to-transparent" />

      {/* Navbar */}
      <div className="relative z-20">
        <Navbar />
      </div>

      {/* Hero content */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-5 sm:px-6 py-10">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold mb-5 sm:mb-6 leading-tight">
          Explore la montagne autrement
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-[#E4E4E4] font-semibold max-w-2xl mb-8 sm:mb-10">
          La communauté Hike &amp; Fly — topos, spots de vol, sorties et carnet de vol, partagés entre pilotes de parapente.
        </p>

        <div className="flex flex-col items-center gap-5 w-full max-w-xs sm:max-w-sm mb-10">
          {isLoggedIn === true && (
            <a
              href="/map"
              className="bg-[#1C0F12] hover:bg-[#BEBCC8] text-[#6F7E86] transition px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl text-base sm:text-lg font-extrabold w-full"
            >
              Découvrir les randonnées
            </a>
          )}

          {isLoggedIn === false && !showForgotPassword && (
            <form onSubmit={handleLogin} className="w-full space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full bg-black/30 border border-[#6F7E86]/50 rounded-xl px-4 py-3 text-sm text-white placeholder-white/60 focus:outline-none focus:border-[#BEBCC8]"
                required
              />
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-black/30 border border-[#6F7E86]/50 rounded-xl px-4 py-3 text-sm text-white placeholder-white/60 focus:outline-none focus:border-[#BEBCC8]"
                required
              />

              {loginError && <p className="text-orange-200 text-sm font-semibold">{loginError}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="flex-1 bg-[#6F7E86]/15 border border-[#6F7E86]/60 hover:bg-[#1C0F12] hover:border-[#1C0F12] transition px-4 py-3 rounded-xl font-bold disabled:opacity-50"
                >
                  {loggingIn ? "Connexion..." : "Connexion"}
                </button>

                <a
                  href="/signup"
                  className="flex-1 bg-[#6F7E86]/15 border border-[#6F7E86]/60 hover:bg-[#1C0F12] hover:border-[#1C0F12] transition px-4 py-3 rounded-xl font-bold text-center"
                >
                  Inscription
                </a>
              </div>

              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setResetEmail(email); setResetMessage(null); }}
                className="text-xs text-[#E4E4E4] hover:text-[#BEBCC8] transition"
              >
                Mot de passe oublié ?
              </button>
            </form>
          )}

          {isLoggedIn === false && showForgotPassword && (
            <form onSubmit={handleResetPassword} className="w-full space-y-3">
              <p className="text-sm text-white/90 text-left">
                Entrez votre email pour recevoir un lien de réinitialisation.
              </p>
              <input
                type="email"
                placeholder="Email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="email"
                className="w-full bg-black/30 border border-[#6F7E86]/50 rounded-xl px-4 py-3 text-sm text-white placeholder-white/60 focus:outline-none focus:border-[#BEBCC8]"
                required
              />

              {resetMessage && (
                <p className={`text-sm font-semibold ${resetMessage.startsWith("Email envoyé") ? "text-[#E4E4E4]" : "text-orange-200"}`}>
                  {resetMessage}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={sendingReset}
                  className="flex-1 bg-[#6F7E86]/15 border border-[#6F7E86]/60 hover:bg-[#1C0F12] hover:border-[#1C0F12] transition px-4 py-3 rounded-xl font-bold disabled:opacity-50"
                >
                  {sendingReset ? "Envoi..." : "Envoyer le lien"}
                </button>

                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setResetMessage(null); }}
                  className="flex-1 bg-[#6F7E86]/10 border border-[#6F7E86]/40 hover:bg-[#6F7E86]/20 transition px-4 py-3 rounded-xl font-bold"
                >
                  Retour
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Chiffres clés — preuve sociale simple */}
        <div className="flex gap-8 sm:gap-14 text-center">
          <div>
            <p className="text-2xl sm:text-4xl font-extrabold text-[#BEBCC8]">{stats.summits}</p>
            <p className="text-xs sm:text-sm text-[#E4E4E4]">Spots</p>
          </div>
          <div>
            <p className="text-2xl sm:text-4xl font-extrabold text-[#BEBCC8]">{stats.outings}</p>
            <p className="text-xs sm:text-sm text-[#E4E4E4]">Sorties partagées</p>
          </div>
          <div>
            <p className="text-2xl sm:text-4xl font-extrabold text-[#BEBCC8]">{stats.users}</p>
            <p className="text-xs sm:text-sm text-[#E4E4E4]">Pilotes</p>
          </div>
        </div>
      </section>
    </main>
  );
}
