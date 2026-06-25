"use client";

import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("Mon compte");

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsLoggedIn(!!user);

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        if (data?.username) {
          setUsername(data.username);
        } else if (user.email) {
          setUsername(user.email.split("@")[0]);
        }
      }
    }

    checkUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUsername("Mon compte");
    window.location.href = "/";
  }

  return (
    <nav className="w-full bg-zinc-900 text-white px-8 py-4 border-b border-zinc-800">
      <div className="flex items-center">
        <a href="/" className="text-2xl font-bold hover:text-green-400 transition">
          Rando App
        </a>

        <div className="flex gap-6 text-sm ml-auto items-center">
          <a href="/" className="hover:text-green-400 transition">
            Accueil
          </a>

          <a href="/map" className="hover:text-green-400 transition">
            Carte
          </a>

          <a href="/communaute" className="hover:text-green-400 transition">
            Communauté
          </a>

          <a href="/forum" className="hover:text-green-400 transition">
            Forum
          </a>

          <div className="relative group">
            <button className="hover:text-green-400 transition">
              🪂 {username}
            </button>

            <div className="absolute right-0 mt-2 w-52 bg-zinc-900 border border-zinc-700 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              {isLoggedIn ? (
                <>
                  <a
                    href="/profile"
                    className="block px-4 py-3 hover:bg-zinc-800 rounded-t-xl"
                  >
                    Mon profil
                  </a>

                  <a
                    href="/profile/flights"
                    className="block px-4 py-3 hover:bg-zinc-800 border-t border-zinc-800"
                  >
                    Journal de vol
                  </a>

                  <a
                    href="/submit-site"
                    className="block px-4 py-3 hover:bg-zinc-800 border-t border-zinc-800"
                  >
                    Ajouter un site
                  </a>

                  <a
                    href="/communaute/submit"
                    className="block px-4 py-3 hover:bg-zinc-800 border-t border-zinc-800"
                  >
                    Partager une sortie
                  </a>

                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-3 hover:bg-zinc-800 rounded-b-xl border-t border-zinc-800 text-red-400"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/login"
                    className="block px-4 py-3 hover:bg-zinc-800 rounded-t-xl"
                  >
                    Connexion
                  </a>

                  <a
                    href="/signup"
                    className="block px-4 py-3 hover:bg-zinc-800 rounded-b-xl border-t border-zinc-800"
                  >
                    Inscription
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
