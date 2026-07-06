"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";

type Achievement = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  unlocked: boolean;
  condition: string;
};

type Stats = {
  totalFlights: number;
  totalMinutes: number;
  totalElevation: number;
  maxElevationSingle: number;
  maxDurationSingle: number;
  minDurationSingle: number;
  fiveStarFlights: number;
  difficultConditions: number;
  oneStarFlights: number;
  equipmentCount: number;
  revisionsCount: number;
  pdfDocsCount: number;
  lightestVoile: number;
  summitsAdded: number;
  toposAdded: number;
  hasGpx: boolean;
  hasPhoto: boolean;
  outingsShared: number;
  suspentesReceived: number;
  suspentesGiven: number;
  commentsPosted: number;
  checklistCompleted: number;
  flightsByMonth: Record<string, number>;
  alpinismTopos: number;
  massifsSeen: Set<string>;
};

function buildAchievements(stats: Stats): Achievement[] {
  const months = Object.values(stats.flightsByMonth);
  const maxFlightsInMonth = Math.max(...months, 0);
  const consecutiveMonths = Object.keys(stats.flightsByMonth).length;

  return [
    // 🥾 APPROCHE
    {
      id: "first_flight", title: "Premiers pas dans le vide", emoji: "🪂",
      description: "Enregistrer son premier vol", category: "Approche",
      unlocked: stats.totalFlights >= 1,
      condition: "1 vol enregistré",
    },
    {
      id: "legs_500", title: "Jambes de curé", emoji: "🦵",
      description: "Premier D+ de 500m en un vol", category: "Approche",
      unlocked: stats.maxElevationSingle >= 500,
      condition: "500m D+ en un vol",
    },
    {
      id: "legs_1000", title: "Mollets en feu", emoji: "🔥",
      description: "Premier D+ de 1000m en un vol", category: "Approche",
      unlocked: stats.maxElevationSingle >= 1000,
      condition: "1000m D+ en un vol",
    },
    {
      id: "legs_2000", title: "Sherpas nous regardent", emoji: "🏔️",
      description: "Premier D+ de 2000m en un vol", category: "Approche",
      unlocked: stats.maxElevationSingle >= 2000,
      condition: "2000m D+ en un vol",
    },
    {
      id: "taxi_voile", title: "Taxi voile", emoji: "🚕",
      description: "10 randonnées enregistrées", category: "Approche",
      unlocked: stats.totalFlights >= 10,
      condition: "10 vols enregistrés",
    },
    {
      id: "alpinisme", title: "Couloir ou décollage ?", emoji: "🧗",
      description: "Avoir un topo d'approche alpinisme", category: "Approche",
      unlocked: stats.alpinismTopos >= 1,
      condition: "1 topo alpinisme ajouté",
    },

    // ⏱️ TEMPS DE VOL
    {
      id: "time_1h", title: "Baptême de l'air", emoji: "⏱️",
      description: "1 heure de vol cumulée", category: "Temps de vol",
      unlocked: stats.totalMinutes >= 60,
      condition: "1h de vol total",
    },
    {
      id: "time_5h", title: "J'ai le pied dans le vide", emoji: "🦶",
      description: "5 heures de vol cumulées", category: "Temps de vol",
      unlocked: stats.totalMinutes >= 300,
      condition: "5h de vol total",
    },
    {
      id: "time_10h", title: "Week-end warrior", emoji: "🏄",
      description: "10 heures de vol cumulées", category: "Temps de vol",
      unlocked: stats.totalMinutes >= 600,
      condition: "10h de vol total",
    },
    {
      id: "time_25h", title: "Mon bureau c'est le ciel", emoji: "💼",
      description: "25 heures de vol cumulées", category: "Temps de vol",
      unlocked: stats.totalMinutes >= 1500,
      condition: "25h de vol total",
    },
    {
      id: "time_50h", title: "Pilote confirmé", emoji: "🎖️",
      description: "50 heures de vol cumulées", category: "Temps de vol",
      unlocked: stats.totalMinutes >= 3000,
      condition: "50h de vol total",
    },
    {
      id: "time_100h", title: "L'air est ma maison", emoji: "🏠",
      description: "100 heures de vol cumulées", category: "Temps de vol",
      unlocked: stats.totalMinutes >= 6000,
      condition: "100h de vol total",
    },
    {
      id: "time_200h", title: "Je dors en parapente", emoji: "😴",
      description: "200 heures de vol cumulées", category: "Temps de vol",
      unlocked: stats.totalMinutes >= 12000,
      condition: "200h de vol total",
    },
    {
      id: "time_500h", title: "Légende vivante", emoji: "👑",
      description: "500 heures de vol cumulées", category: "Temps de vol",
      unlocked: stats.totalMinutes >= 30000,
      condition: "500h de vol total",
    },
    {
      id: "single_2h", title: "Café froid à l'atterro", emoji: "☕",
      description: "Vol de plus de 2h d'un coup", category: "Temps de vol",
      unlocked: stats.maxDurationSingle >= 120,
      condition: "2h en un seul vol",
    },
    {
      id: "single_3h", title: "Le sandwich attend", emoji: "🥪",
      description: "Vol de plus de 3h d'un coup", category: "Temps de vol",
      unlocked: stats.maxDurationSingle >= 180,
      condition: "3h en un seul vol",
    },
    {
      id: "single_5h", title: "Ma femme m'a appelé 12 fois", emoji: "📱",
      description: "Vol de plus de 5h d'un coup", category: "Temps de vol",
      unlocked: stats.maxDurationSingle >= 300,
      condition: "5h en un seul vol",
    },
    {
      id: "single_8h", title: "Pilote ou albatros ?", emoji: "🦅",
      description: "Vol de plus de 8h d'un coup", category: "Temps de vol",
      unlocked: stats.maxDurationSingle >= 480,
      condition: "8h en un seul vol",
    },

    // 📅 RÉGULARITÉ
    {
      id: "monthly_5", title: "Accro certifié", emoji: "📅",
      description: "5 vols dans le même mois", category: "Régularité",
      unlocked: maxFlightsInMonth >= 5,
      condition: "5 vols en 1 mois",
    },
    {
      id: "monthly_10", title: "Toutes les semaines", emoji: "🗓️",
      description: "10 vols dans le même mois", category: "Régularité",
      unlocked: maxFlightsInMonth >= 10,
      condition: "10 vols en 1 mois",
    },
    {
      id: "consistent_6", title: "Il pleut ? Et alors", emoji: "🌧️",
      description: "Vols enregistrés 6 mois différents", category: "Régularité",
      unlocked: consecutiveMonths >= 6,
      condition: "6 mois avec des vols",
    },
    {
      id: "consistent_12", title: "365 jours de rêve", emoji: "🌈",
      description: "Vols enregistrés toute l'année", category: "Régularité",
      unlocked: consecutiveMonths >= 12,
      condition: "12 mois avec des vols",
    },
    {
      id: "flights_20", title: "Le vent m'a dit vas-y", emoji: "💨",
      description: "20 vols enregistrés", category: "Régularité",
      unlocked: stats.totalFlights >= 20,
      condition: "20 vols enregistrés",
    },
    {
      id: "flights_50", title: "C'était prévu", emoji: "📋",
      description: "50 vols enregistrés", category: "Régularité",
      unlocked: stats.totalFlights >= 50,
      condition: "50 vols enregistrés",
    },
    {
      id: "flights_100", title: "Vario de compétition", emoji: "🏆",
      description: "100 vols enregistrés", category: "Régularité",
      unlocked: stats.totalFlights >= 100,
      condition: "100 vols enregistrés",
    },

    // 🎒 MATÉRIEL
    {
      id: "first_gear", title: "Je porte tout", emoji: "🎒",
      description: "5 équipements enregistrés", category: "Matériel",
      unlocked: stats.equipmentCount >= 5,
      condition: "5 équipements",
    },
    {
      id: "revision", title: "Révision ? C'est fait", emoji: "🔧",
      description: "Première révision de secours enregistrée", category: "Matériel",
      unlocked: stats.revisionsCount >= 1,
      condition: "1 révision enregistrée",
    },
    {
      id: "pdf_doc", title: "Mon précieux", emoji: "📄",
      description: "Premier document PDF uploadé sur une voile", category: "Matériel",
      unlocked: stats.pdfDocsCount >= 1,
      condition: "1 document PDF uploadé",
    },

    // 🌟 QUALITÉ
    {
      id: "five_star", title: "Mon instructeur serait fier", emoji: "⭐",
      description: "Vol noté 5 étoiles", category: "Qualité",
      unlocked: stats.fiveStarFlights >= 1,
      condition: "1 vol 5 étoiles",
    },
    {
      id: "one_star", title: "Atterro de précision", emoji: "💀",
      description: "Vol noté 1 étoile — ça arrive", category: "Qualité",
      unlocked: stats.oneStarFlights >= 1,
      condition: "1 vol 1 étoile",
    },
    {
      id: "difficult", title: "C'était technique", emoji: "😅",
      description: "Conditions difficiles mentionnées dans une sortie", category: "Qualité",
      unlocked: stats.difficultConditions >= 1,
      condition: "1 sortie en conditions difficiles",
    },

    // 👥 COMMUNAUTÉ
    {
      id: "first_summit", title: "Cartographe du ciel", emoji: "🗺️",
      description: "Premier spot ajouté et validé", category: "Communauté",
      unlocked: stats.summitsAdded >= 1,
      condition: "1 spot validé",
    },
    {
      id: "three_summits", title: "Pilote de référence", emoji: "📍",
      description: "3 spots validés", category: "Communauté",
      unlocked: stats.summitsAdded >= 3,
      condition: "3 spots validés",
    },
    {
      id: "five_topos", title: "Encyclopédie volante", emoji: "📚",
      description: "5 topos ajoutés et validés", category: "Communauté",
      unlocked: stats.toposAdded >= 5,
      condition: "5 topos validés",
    },
    {
      id: "first_outing", title: "Posteur compulsif", emoji: "📸",
      description: "5 sorties partagées", category: "Communauté",
      unlocked: stats.outingsShared >= 5,
      condition: "5 sorties partagées",
    },
    {
      id: "suspentes_10", title: "Influenceur de l'air", emoji: "🪂",
      description: "10 suspentes reçues", category: "Communauté",
      unlocked: stats.suspentesReceived >= 10,
      condition: "10 suspentes reçues",
    },
    {
      id: "suspentes_50", title: "Légende locale", emoji: "🌟",
      description: "50 suspentes reçues", category: "Communauté",
      unlocked: stats.suspentesReceived >= 50,
      condition: "50 suspentes reçues",
    },
    {
      id: "suspentes_given", title: "Suspente généreuse", emoji: "🎁",
      description: "20 suspentes données à d'autres pilotes", category: "Communauté",
      unlocked: stats.suspentesGiven >= 20,
      condition: "20 suspentes données",
    },
    {
      id: "comments_10", title: "Raconteur de vol", emoji: "💬",
      description: "10 commentaires postés", category: "Communauté",
      unlocked: stats.commentsPosted >= 10,
      condition: "10 commentaires",
    },

    // ✅ SÉCURITÉ
    {
      id: "checklist_10", title: "Autonomie totale", emoji: "✅",
      description: "Checklist complétée 10 fois", category: "Sécurité",
      unlocked: stats.checklistCompleted >= 10,
      condition: "10 checklists complétées",
    },

    // 👶 PREMIÈRES FOIS
    {
      id: "first_outing_shared", title: "Première sortie partagée", emoji: "📸",
      description: "Première sortie publiée dans la communauté", category: "Premières fois",
      unlocked: stats.outingsShared >= 1,
      condition: "1 sortie partagée",
    },
    {
      id: "first_comment", title: "Premier commentaire", emoji: "💬",
      description: "Premier message posté dans la communauté", category: "Premières fois",
      unlocked: stats.commentsPosted >= 1,
      condition: "1 commentaire posté",
    },
    {
      id: "first_suspente_given", title: "Première suspente donnée", emoji: "🎁",
      description: "Encourager un autre pilote pour la première fois", category: "Premières fois",
      unlocked: stats.suspentesGiven >= 1,
      condition: "1 suspente donnée",
    },
    {
      id: "first_gpx", title: "Baptême GPX", emoji: "🗺️",
      description: "Premier fichier GPX uploadé sur un topo", category: "Premières fois",
      unlocked: stats.hasGpx,
      condition: "1 fichier GPX uploadé",
    },
    {
      id: "first_photo", title: "Première photo", emoji: "📷",
      description: "Première photo uploadée sur un topo", category: "Premières fois",
      unlocked: stats.hasPhoto,
      condition: "1 photo uploadée",
    },

    // 😂 HUMOUR
    {
      id: "retour_a_pied", title: "Retour à pied", emoji: "🚶",
      description: "Vol de moins de 5 minutes — ça arrive à tout le monde", category: "Humour",
      unlocked: stats.minDurationSingle > 0 && stats.minDurationSingle < 5,
      condition: "Vol de moins de 5 min",
    },
    {
      id: "sac_pese_rien", title: "Le sac pèse rien", emoji: "🪶",
      description: "Voile de moins de 2kg enregistrée dans le matériel", category: "Humour",
      unlocked: stats.lightestVoile > 0 && stats.lightestVoile < 2000,
      condition: "Voile < 2kg enregistrée",
    },

    // 🏔️ DÉNIVELÉ CUMULÉ
    {
      id: "elev_1000", title: "Ça monte encore ?", emoji: "📈",
      description: "1000m de D+ cumulé dans le journal", category: "Dénivelé",
      unlocked: stats.totalElevation >= 1000,
      condition: "1000m D+ cumulé",
    },
    {
      id: "elev_montblanc", title: "Mont Blanc dans les pattes", emoji: "🏔️",
      description: "4810m de D+ cumulé — l'altitude du Mont Blanc", category: "Dénivelé",
      unlocked: stats.totalElevation >= 4810,
      condition: "4810m D+ cumulé",
    },
    {
      id: "elev_everest", title: "Everest à pied", emoji: "🌏",
      description: "8848m de D+ cumulé — le toit du monde", category: "Dénivelé",
      unlocked: stats.totalElevation >= 8848,
      condition: "8848m D+ cumulé",
    },
    {
      id: "elev_20k", title: "Ascenseur cassé", emoji: "🛗",
      description: "20 000m de D+ cumulé", category: "Dénivelé",
      unlocked: stats.totalElevation >= 20000,
      condition: "20 000m D+ cumulé",
    },
    {
      id: "elev_50k", title: "Jambes bioniques", emoji: "🦾",
      description: "50 000m de D+ cumulé", category: "Dénivelé",
      unlocked: stats.totalElevation >= 50000,
      condition: "50 000m D+ cumulé",
    },

    // 🗻 MASSIFS
    {
      id: "massif_3", title: "Collectionneur de massifs", emoji: "🗂️",
      description: "Vols sur 3 massifs différents", category: "Massifs",
      unlocked: stats.massifsSeen.size >= 3,
      condition: "3 massifs différents",
    },
    {
      id: "massif_5", title: "Tour des Alpes", emoji: "🔭",
      description: "Vols sur 5 massifs différents", category: "Massifs",
      unlocked: stats.massifsSeen.size >= 5,
      condition: "5 massifs différents",
    },
    {
      id: "massif_10", title: "Nomade des cimes", emoji: "🧭",
      description: "Vols sur 10 massifs différents", category: "Massifs",
      unlocked: stats.massifsSeen.size >= 10,
      condition: "10 massifs différents",
    },
    {
      id: "massif_bornes", title: "Bornes-Aravis découvert", emoji: "🟢",
      description: "Vol sur le massif des Bornes-Aravis", category: "Massifs",
      unlocked: stats.massifsSeen.has("Bornes - Aravis"),
      condition: "Vol Bornes-Aravis",
    },
    {
      id: "massif_montblanc", title: "Mont Blanc conquis", emoji: "⬜",
      description: "Vol sur le massif du Mont Blanc", category: "Massifs",
      unlocked: stats.massifsSeen.has("Mont Blanc"),
      condition: "Vol Mont Blanc",
    },
    {
      id: "massif_vanoise", title: "Vanoise explorée", emoji: "🦌",
      description: "Vol sur le massif de la Vanoise", category: "Massifs",
      unlocked: stats.massifsSeen.has("Vanoise"),
      condition: "Vol Vanoise",
    },
    {
      id: "massif_ecrins", title: "Ecrins domptés", emoji: "💎",
      description: "Vol sur le massif des Ecrins", category: "Massifs",
      unlocked: stats.massifsSeen.has("Ecrins"),
      condition: "Vol Ecrins",
    },
    {
      id: "massif_mercantour", title: "Méditerranéen", emoji: "🌊",
      description: "Vol dans le Mercantour", category: "Massifs",
      unlocked: stats.massifsSeen.has("Mercantour"),
      condition: "Vol Mercantour",
    },
  ];
}

export default function AchievementsPage() {
  const router = useRouter();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Tous");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [
        { data: flights },
        { data: equipment },
        { data: summits },
        { data: topos },
        { data: outings },
        { data: suspentesReceived },
        { data: suspentesGiven },
        { data: comments },
        { data: checklist },
      ] = await Promise.all([
        supabase.from("flight_logs").select("*").eq("user_id", user.id),
        supabase.from("equipment").select("*").eq("user_id", user.id),
        supabase.from("summits").select("id, status").eq("user_id", user.id),
        supabase.from("topos").select("id, status, approach_type").eq("user_id", user.id),
        supabase.from("outings").select("id").eq("user_id", user.id),
        supabase.from("suspentes").select("id").eq("outing_id", user.id),
        supabase.from("suspentes").select("id").eq("user_id", user.id),
        supabase.from("outing_comments").select("id").eq("user_id", user.id),
        supabase.from("checklist_items").select("checked").eq("user_id", user.id).eq("checked", true),
      ]);

      // suspentes received = suspentes on user's outings
      const userOutingIds = (outings || []).map((o) => o.id);
      let suspentesReceivedCount = 0;
      if (userOutingIds.length > 0) {
        const { count } = await supabase
          .from("suspentes")
          .select("*", { count: "exact", head: true })
          .in("outing_id", userOutingIds);
        suspentesReceivedCount = count || 0;
      }

      const flightsList = flights || [];
      const totalMinutes = flightsList.reduce((sum, f) => sum + (f.duration_minutes || 0), 0);
      const totalElevation = flightsList.reduce((sum, f) => sum + (f.elevation_gain || 0), 0);
      const maxElevationSingle = Math.max(...flightsList.map((f) => f.elevation_gain || 0), 0);
      const maxDurationSingle = Math.max(...flightsList.map((f) => f.duration_minutes || 0), 0);
      const durationsAboveZero = flightsList.filter((f) => f.duration_minutes > 0).map((f) => f.duration_minutes);
      const minDurationSingle = durationsAboveZero.length > 0 ? Math.min(...durationsAboveZero) : 0;
      const fiveStarFlights = flightsList.filter((f) => f.rating === 5).length;
      const oneStarFlights = flightsList.filter((f) => f.rating === 1).length;
      const difficultConditions = flightsList.filter((f) => f.conditions && (f.conditions.toLowerCase().includes("fort") || f.conditions.toLowerCase().includes("difficile") || f.conditions.toLowerCase().includes("turbul"))).length;

      const flightsByMonth: Record<string, number> = {};
      for (const f of flightsList) {
        if (f.date) {
          const key = f.date.substring(0, 7);
          flightsByMonth[key] = (flightsByMonth[key] || 0) + 1;
        }
      }

      // Massifs from flight logs (site_name matching)
      const massifsSeen = new Set<string>();
      for (const f of flightsList) {
        if (f.site_name) {
          // Try to match massif from site name via summits
        }
      }
      // Load massifs from user's flight logs via summits
      const siteIds = flightsList.filter((f) => f.site_id).map((f) => f.site_id);
      if (siteIds.length > 0) {
        const { data: summitsForFlights } = await supabase
          .from("summits")
          .select("massif")
          .in("id", siteIds);
        for (const s of summitsForFlights || []) {
          if (s.massif) massifsSeen.add(s.massif);
        }
      }

      // Lightest voile
      const voiles = (equipment || []).filter((e) => e.type === "Voile");
      const lightestVoile = voiles.length > 0 ? Math.min(...voiles.map((v) => v.weight_grams || 9999)) : 9999;

      // Check GPX and photos from topos
      const topoIds = (topos || []).filter((t) => t.status === "approved").map((t) => t.id);
      let hasGpx = false;
      let hasPhoto = false;
      if (topoIds.length > 0) {
        for (const topoId of topoIds.slice(0, 5)) {
          const { data: gpxFiles } = await supabase.storage.from("topos-gpx").list(topoId);
          if (gpxFiles && gpxFiles.length > 0) { hasGpx = true; }
          const { data: photoFiles } = await supabase.storage.from("topos-photos").list(topoId);
          if (photoFiles && photoFiles.length > 0) { hasPhoto = true; }
          if (hasGpx && hasPhoto) break;
        }
      }

      const stats: Stats = {
        totalFlights: flightsList.length,
        totalMinutes,
        totalElevation,
        maxElevationSingle,
        maxDurationSingle,
        minDurationSingle,
        fiveStarFlights,
        oneStarFlights,
        difficultConditions,
        equipmentCount: (equipment || []).length,
        revisionsCount: (equipment || []).filter((e) => e.last_check_date).length,
        pdfDocsCount: 0,
        lightestVoile,
        summitsAdded: (summits || []).filter((s) => s.status === "approved").length,
        toposAdded: (topos || []).filter((t) => t.status === "approved").length,
        alpinismTopos: (topos || []).filter((t) => t.approach_type === "Alpinisme").length,
        hasGpx,
        hasPhoto,
        outingsShared: (outings || []).length,
        suspentesReceived: suspentesReceivedCount,
        suspentesGiven: (suspentesGiven || []).length,
        commentsPosted: (comments || []).length,
        checklistCompleted: Math.floor((checklist || []).length / 5),
        flightsByMonth,
        massifsSeen,
      };

      setAchievements(buildAchievements(stats));
      setLoading(false);
    }
    load();
  }, []);

  const categories = ["Tous", "Approche", "Temps de vol", "Régularité", "Matériel", "Qualité", "Communauté", "Sécurité", "Premières fois", "Humour", "Dénivelé", "Massifs"];
  const filtered = activeCategory === "Tous" ? achievements : achievements.filter((a) => a.category === activeCategory);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-400 text-xl">Calcul de tes succès...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="p-10">
        <a href="/profile" className="text-gray-400 hover:text-green-400 transition mb-8 inline-block">
          &larr; Retour au profil
        </a>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-5xl font-bold">Mes succès</h1>
          <div className="text-right">
            <p className="text-4xl font-bold text-green-400">{unlockedCount}<span className="text-2xl text-gray-400">/{achievements.length}</span></p>
            <p className="text-gray-400 text-sm">succès débloqués</p>
          </div>
        </div>

        <p className="text-amber-400 italic text-sm mb-6">&ldquo;Le relief est là pour te rappeler ta finesse réelle.&rdquo;</p>

        <div className="w-full bg-zinc-800 rounded-full h-3 mb-8">
          <div
            className="bg-green-500 h-3 rounded-full transition-all"
            style={{ width: `${achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0}%` }}
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeCategory === cat ? "bg-green-500 text-white" : "bg-zinc-900 border border-zinc-700 text-gray-300 hover:border-green-500"}`}>
              {cat}
              {cat !== "Tous" && (
                <span className="ml-2 text-xs opacity-70">
                  {achievements.filter((a) => a.category === cat && a.unlocked).length}/{achievements.filter((a) => a.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((achievement) => (
            <div
              key={achievement.id}
              className={`relative rounded-2xl p-5 border transition ${
                achievement.unlocked
                  ? "bg-zinc-900 border-green-500"
                  : "bg-zinc-950 border-zinc-800 opacity-50"
              }`}
            >
              {achievement.unlocked && (
                <div className="absolute top-3 right-3 w-2 h-2 bg-green-400 rounded-full" />
              )}
              <div className="flex items-start gap-4">
                <span className={`text-4xl ${!achievement.unlocked ? "grayscale" : ""}`}>
                  {achievement.emoji}
                </span>
                <div className="flex-1">
                  <h3 className={`font-bold text-lg leading-tight mb-1 ${achievement.unlocked ? "text-white" : "text-gray-500"}`}>
                    {achievement.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-2">{achievement.description}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${achievement.unlocked ? "bg-green-900 text-green-300" : "bg-zinc-800 text-gray-600"}`}>
                    {achievement.condition}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
