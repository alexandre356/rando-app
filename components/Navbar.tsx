"use client";

import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("Mon compte");
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const ADMIN_UID = "8dda6bc2-0ddc-42f5-949f-0c28fa4c6635";

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      setIsAdmin(user?.id === ADMIN_UID);

      if (user) {
        const { data } = await supabase.from("profiles").select("username").eq("id", user.id).single();
        if (data?.username) setUsername(data.username);
        else if (user.email) setUsername(user.email.split("@")[0]);
      }
    }
    checkUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <nav className="w-full bg-zinc-900 text-white px-5 md:px-8 py-4 border-b border-zinc-800 relative z-50">
      <div className="flex items-center justify-between">
        <a href="/" className="text-xl md:text-2xl font-bold hover:text-green-400 transition">Marche&amp;Plouf</a>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-6 text-sm ml-auto items-center">
          <a href="/" className="hover:text-green-400 transition">Accueil</a>
          <a href="/map" className="hover:text-green-400 transition">Carte</a>
          <a href="/communaute" className="hover:text-green-400 transition">Communauté</a>
          <a href="/forum" className="hover:text-green-400 transition">Forum</a>
          <a href="/legal" className="hover:text-red-300 transition text-red-500 text-xs">Légal</a>

          <div className="relative group">
            <button className="hover:text-green-400 transition">🪂 {username}</button>
            <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              {isLoggedIn ? (
                <>
                  <a href="/profile" className="block px-4 py-3 hover:bg-zinc-800 rounded-t-xl">Mon profil</a>
                  <a href="/profile/flights" className="block px-4 py-3 hover:bg-zinc-800 border-t border-zinc-800">Journal de vol</a>
                  <a href="/profile/checklist" className="block px-4 py-3 hover:bg-zinc-800 border-t border-zinc-800">Checklist pré-vol</a>
                  <a href="/profile/equipment" className="block px-4 py-3 hover:bg-zinc-800 border-t border-zinc-800">Mon matériel</a>
                  <a href="/profile/achievements" className="block px-4 py-3 hover:bg-zinc-800 border-t border-zinc-800 text-yellow-400">🏆 Mes succès</a>
                  {isAdmin && (
                    <a href="/admin" className="block px-4 py-3 hover:bg-zinc-800 border-t border-zinc-800 text-orange-400">Administration</a>
                  )}
                  <button onClick={handleLogout} className="block w-full text-left px-4 py-3 hover:bg-zinc-800 rounded-b-xl border-t border-zinc-800 text-red-400">
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <a href="/login" className="block px-4 py-3 hover:bg-zinc-800 rounded-t-xl">Connexion</a>
                  <a href="/signup" className="block px-4 py-3 hover:bg-zinc-800 rounded-b-xl border-t border-zinc-800">Inscription</a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile burger button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2"
          aria-label="Menu"
        >
          <span className={`block w-6 h-0.5 bg-white transition-transform ${mobileMenuOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-6 h-0.5 bg-white transition-opacity ${mobileMenuOpen ? "opacity-0" : ""}`} />
          <span className={`block w-6 h-0.5 bg-white transition-transform ${mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-zinc-900 border-t border-zinc-800 shadow-2xl">
          <a href="/" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-zinc-800 border-b border-zinc-800">Accueil</a>
          <a href="/map" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-zinc-800 border-b border-zinc-800">Carte</a>
          <a href="/communaute" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-zinc-800 border-b border-zinc-800">Communauté</a>
          <a href="/forum" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-zinc-800 border-b border-zinc-800">Forum</a>

          {isLoggedIn ? (
            <>
              <a href="/profile" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-zinc-800 border-b border-zinc-800 text-green-400 font-semibold">🪂 {username}</a>
              <a href="/profile/flights" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-zinc-800 border-b border-zinc-800">Journal de vol</a>
              <a href="/profile/checklist" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-zinc-800 border-b border-zinc-800">Checklist pré-vol</a>
              <a href="/profile/equipment" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-zinc-800 border-b border-zinc-800">Mon matériel</a>
              <a href="/profile/achievements" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-zinc-800 border-b border-zinc-800 text-yellow-400">🏆 Mes succès</a>
              {isAdmin && (
                <a href="/admin" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-zinc-800 border-b border-zinc-800 text-orange-400">Administration</a>
              )}
              <button onClick={handleLogout} className="block w-full text-left px-6 py-4 hover:bg-zinc-800 border-b border-zinc-800 text-red-400">
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <a href="/login" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-zinc-800 border-b border-zinc-800">Connexion</a>
              <a href="/signup" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-zinc-800 border-b border-zinc-800">Inscription</a>
            </>
          )}
          <a href="/legal" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-zinc-800 text-red-500 text-sm">Légal</a>
        </div>
      )}
    </nav>
  );
}
