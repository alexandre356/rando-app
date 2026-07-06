"use client";

import Navbar from "../components/Navbar";

export default function Home() {
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
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6">
        <h1 className="text-6xl md:text-7xl font-bold mb-6">
          Explore la montagne autrement
        </h1>

        <p className="text-xl text-gray-200 max-w-2xl mb-10">
          Plus le sac est petit, plus le pilote est dangereux.
        </p>

        <a
          href="/map"
          className="bg-green-500 hover:bg-green-600 transition px-8 py-4 rounded-xl text-lg font-semibold"
        >
          Découvrir les randonnées
        </a>
      </section>
    </main>
  );
}
