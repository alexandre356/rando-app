"use client";

import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("Mon compte");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);

  const ADMIN_UID = "8dda6bc2-0ddc-42f5-949f-0c28fa4c6635";

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      setIsAdmin(user?.id === ADMIN_UID);

      if (user) {
        const { data } = await supabase.from("profiles").select("username, avatar_url").eq("id", user.id).single();
        if (data?.username) setUsername(data.username);
        else if (user.email) setUsername(user.email.split("@")[0]);
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      }
    }
    checkUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function openMobileMenu() {
    setMobileAccountOpen(false);
    setMobileMenuOpen(!mobileMenuOpen);
  }

  function openMobileAccount() {
    setMobileMenuOpen(false);
    setMobileAccountOpen(!mobileAccountOpen);
  }

  return (
    <nav className="w-full bg-[#E4E4E4] text-[#6F7E86] px-5 md:px-8 py-4 relative z-50">
      <div className="flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <img
            src="/mascot-paragliding.png"
            alt="Mascotte Marche&Plouf"
            width={44}
            height={44}
            className="object-contain shrink-0"
          />
          <span
            className="text-4xl md:text-5xl hover:text-[#1C0F12] transition"
            style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}
          >
            Marche&amp;Plouf
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-3 text-sm ml-auto items-center font-bold">
          <a href="/" className="bg-[#1C0F12]/15 hover:bg-[#BEBCC8] text-[#6F7E86] hover:text-[#E4E4E4] transition px-4 py-2 rounded-xl">Accueil</a>
          <a href="/map" className="bg-[#1C0F12]/15 hover:bg-[#BEBCC8] text-[#6F7E86] hover:text-[#E4E4E4] transition px-4 py-2 rounded-xl">Carte</a>
          <a href="/communaute" className="bg-[#1C0F12]/15 hover:bg-[#BEBCC8] text-[#6F7E86] hover:text-[#E4E4E4] transition px-4 py-2 rounded-xl">Communauté</a>
          <a href="/forum" className="bg-[#1C0F12]/15 hover:bg-[#BEBCC8] text-[#6F7E86] hover:text-[#E4E4E4] transition px-4 py-2 rounded-xl">Forum</a>

          <div className="relative group">
            <button className="bg-[#1C0F12] hover:bg-[#BEBCC8] text-[#6F7E86] transition text-lg font-extrabold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2">
              🪂 {username}
            </button>
            <div className="absolute right-0 mt-2 w-56 bg-[#E4E4E4] border border-[#6F7E86]/40 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              {isLoggedIn ? (
                <>
                  <a href="/profile" className="block px-4 py-3 hover:bg-[#6F7E86]/15 rounded-t-xl">Mon profil</a>
                  <a href="/profile/flights" className="block px-4 py-3 hover:bg-[#6F7E86]/15 border-t border-[#6F7E86]/30">Journal de vol</a>
                  <a href="/profile/checklist" className="block px-4 py-3 hover:bg-[#6F7E86]/15 border-t border-[#6F7E86]/30">Checklist pré-vol</a>
                  <a href="/profile/equipment" className="block px-4 py-3 hover:bg-[#6F7E86]/15 border-t border-[#6F7E86]/30">Mon matériel</a>
                  <a href="/profile/achievements" className="block px-4 py-3 hover:bg-[#6F7E86]/15 border-t border-[#6F7E86]/30 text-[#1C0F12]">🏆 Mes succès</a>
                  {isAdmin && (
                    <a href="/admin" className="block px-4 py-3 hover:bg-[#6F7E86]/15 border-t border-[#6F7E86]/30 text-[#1C0F12]">Administration</a>
                  )}
                  <button onClick={handleLogout} className="block w-full text-left px-4 py-3 hover:bg-[#6F7E86]/15 border-t border-[#6F7E86]/30 text-red-700">
                    Déconnexion
                  </button>
                  <a href="/legal" className="block px-4 py-3 hover:bg-[#6F7E86]/15 rounded-b-xl border-t border-[#6F7E86]/30 text-[#6F7E86] text-xs">Mentions légales</a>
                </>
              ) : (
                <>
                  <a href="/login" className="block px-4 py-3 hover:bg-[#6F7E86]/15 rounded-t-xl">Connexion</a>
                  <a href="/signup" className="block px-4 py-3 hover:bg-[#6F7E86]/15 border-t border-[#6F7E86]/30">Inscription</a>
                  <a href="/legal" className="block px-4 py-3 hover:bg-[#6F7E86]/15 rounded-b-xl border-t border-[#6F7E86]/30 text-[#6F7E86] text-xs">Mentions légales</a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile buttons : burger + profil */}
        <div className="md:hidden flex items-center gap-2">

          {/* Carré burger */}
          <button
            onClick={openMobileMenu}
            aria-label="Menu"
            className={`w-10 h-10 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition ${
              mobileMenuOpen
                ? "bg-[#1C0F12] border-[#1C0F12]"
                : "bg-[#6F7E86]/10 border-[#6F7E86]/50"
            }`}
          >
            <span className={`block w-5 h-0.5 transition-transform ${mobileMenuOpen ? "bg-[#E4E4E4] rotate-45 translate-y-2" : "bg-[#6F7E86]"}`} />
            <span className={`block w-5 h-0.5 transition-opacity ${mobileMenuOpen ? "bg-[#E4E4E4] opacity-0" : "bg-[#6F7E86]"}`} />
            <span className={`block w-5 h-0.5 transition-transform ${mobileMenuOpen ? "bg-[#E4E4E4] -rotate-45 -translate-y-2" : "bg-[#6F7E86]"}`} />
          </button>

          {/* Ovale profil (photo) */}
          <button
            onClick={openMobileAccount}
            aria-label="Mon compte"
            className={`w-14 h-10 rounded-full border flex items-center justify-center overflow-hidden transition ${
              mobileAccountOpen
                ? "bg-[#1C0F12] border-[#1C0F12]"
                : "bg-[#6F7E86]/10 border-[#6F7E86]/50"
            }`}
          >
            {isLoggedIn && avatarUrl ? (
              <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg">🪂</span>
            )}
          </button>
        </div>
      </div>

      {/* Menu mobile : NAVIGATION */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#E4E4E4] border-t border-[#6F7E86]/40 shadow-2xl max-h-[85vh] overflow-y-auto font-bold">
          <p className="px-6 py-3 bg-[#6F7E86]/10 text-[#6F7E86]/80 text-xs uppercase tracking-wide">
            Navigation
          </p>
          <a href="/" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-[#6F7E86]/15 border-b border-[#6F7E86]/30">Accueil</a>
          <a href="/map" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-[#6F7E86]/15 border-b border-[#6F7E86]/30">Carte</a>
          <a href="/communaute" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-[#6F7E86]/15 border-b border-[#6F7E86]/30">Communauté</a>
          <a href="/forum" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-4 hover:bg-[#6F7E86]/15">Forum</a>
        </div>
      )}

      {/* Menu mobile : COMPTE */}
      {mobileAccountOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#E4E4E4] border-t border-[#6F7E86]/40 shadow-2xl max-h-[85vh] overflow-y-auto font-bold">
          <p className="mx-4 my-3 bg-[#1C0F12] text-[#6F7E86] font-extrabold text-lg rounded-xl px-4 py-3 text-center">
            {isLoggedIn ? `🪂 ${username}` : "Mon compte"}
          </p>
          {isLoggedIn ? (
            <>
              <a href="/profile" onClick={() => setMobileAccountOpen(false)} className="block px-6 py-4 hover:bg-[#6F7E86]/15 border-b border-[#6F7E86]/30 text-[#1C0F12]">Mon profil</a>
              <a href="/profile/flights" onClick={() => setMobileAccountOpen(false)} className="block px-6 py-4 hover:bg-[#6F7E86]/15 border-b border-[#6F7E86]/30">Journal de vol</a>
              <a href="/profile/checklist" onClick={() => setMobileAccountOpen(false)} className="block px-6 py-4 hover:bg-[#6F7E86]/15 border-b border-[#6F7E86]/30">Checklist pré-vol</a>
              <a href="/profile/equipment" onClick={() => setMobileAccountOpen(false)} className="block px-6 py-4 hover:bg-[#6F7E86]/15 border-b border-[#6F7E86]/30">Mon matériel</a>
              <a href="/profile/achievements" onClick={() => setMobileAccountOpen(false)} className="block px-6 py-4 hover:bg-[#6F7E86]/15 border-b border-[#6F7E86]/30 text-[#1C0F12]">🏆 Mes succès</a>
              {isAdmin && (
                <a href="/admin" onClick={() => setMobileAccountOpen(false)} className="block px-6 py-4 hover:bg-[#6F7E86]/15 border-b border-[#6F7E86]/30 text-[#1C0F12]">Administration</a>
              )}
              <button onClick={handleLogout} className="block w-full text-left px-6 py-4 hover:bg-[#6F7E86]/15 border-b border-[#6F7E86]/30 text-red-700">
                Déconnexion
              </button>
              <a href="/legal" onClick={() => setMobileAccountOpen(false)} className="block px-6 py-4 hover:bg-[#6F7E86]/15 text-[#6F7E86] text-xs">Mentions légales</a>
            </>
          ) : (
            <>
              <a href="/login" onClick={() => setMobileAccountOpen(false)} className="block px-6 py-4 hover:bg-[#6F7E86]/15 border-b border-[#6F7E86]/30">Connexion</a>
              <a href="/signup" onClick={() => setMobileAccountOpen(false)} className="block px-6 py-4 hover:bg-[#6F7E86]/15 border-b border-[#6F7E86]/30">Inscription</a>
              <a href="/legal" onClick={() => setMobileAccountOpen(false)} className="block px-6 py-4 hover:bg-[#6F7E86]/15 text-[#6F7E86] text-xs">Mentions légales</a>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
