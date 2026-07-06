"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";

const DEFAULT_ITEMS = [
  "Voile — inspection visuelle",
  "Sellette — boucles et sangles",
  "Secours — poignée accessible",
  "Casque",
  "Vario / GPS",
  "Radio",
  "Réserve d'eau",
  "Téléphone chargé",
  "Météo vérifiée",
  "Zone d'atterrissage repérée",
  "Briefing avec équipiers",
];

type Item = {
  id: string;
  label: string;
  checked: boolean;
  order_index: number;
};

export default function ChecklistPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      let { data: checklist } = await supabase
        .from("checklists")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!checklist) {
        const { data: newChecklist } = await supabase
          .from("checklists")
          .insert({ user_id: user.id, name: "Ma checklist pré-vol" })
          .select("id")
          .single();
        checklist = newChecklist;

        if (newChecklist) {
          const defaultItems = DEFAULT_ITEMS.map((label, i) => ({
            user_id: user.id,
            checklist_id: newChecklist.id,
            label,
            checked: false,
            order_index: i,
          }));
          await supabase.from("checklist_items").insert(defaultItems);
        }
      }

      if (checklist) {
        setChecklistId(checklist.id);
        const { data: itemsData } = await supabase
          .from("checklist_items")
          .select("*")
          .eq("checklist_id", checklist.id)
          .order("order_index");
        setItems(itemsData || []);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function toggleItem(item: Item) {
    const newChecked = !item.checked;
    setItems(items.map((i) => i.id === item.id ? { ...i, checked: newChecked } : i));
    await supabase.from("checklist_items").update({ checked: newChecked }).eq("id", item.id);
  }

  async function addItem() {
    if (!newLabel.trim() || !checklistId || !userId) return;
    const { data } = await supabase
      .from("checklist_items")
      .insert({
        user_id: userId,
        checklist_id: checklistId,
        label: newLabel.trim(),
        checked: false,
        order_index: items.length,
      })
      .select("*")
      .single();
    if (data) setItems([...items, data]);
    setNewLabel("");
  }

  async function deleteItem(id: string) {
    await supabase.from("checklist_items").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
  }

  async function resetAll() {
    setResetting(true);
    const ids = items.map((i) => i.id);
    await supabase.from("checklist_items").update({ checked: false }).in("id", ids);
    setItems(items.map((i) => ({ ...i, checked: false })));
    setResetting(false);
  }

  const checkedCount = items.filter((i) => i.checked).length;
  const allChecked = items.length > 0 && checkedCount === items.length;

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Navbar />
      <style>{`@media print { .print\\:hidden { display: none !important; } body { background: white !important; color: black !important; } .bg-zinc-900 { background: white !important; border: 1px solid #ccc !important; } .bg-black { background: white !important; } .text-white { color: black !important; } .text-gray-300, .text-gray-400, .text-gray-500 { color: #333 !important; } .text-green-400 { color: #16a34a !important; } }`}</style>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-400 text-xl">Chargement...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <style>{`@media print { .print\\:hidden { display: none !important; } body { background: white !important; color: black !important; } .bg-zinc-900 { background: white !important; border: 1px solid #ccc !important; } .bg-black { background: white !important; } .text-white { color: black !important; } .text-gray-300, .text-gray-400, .text-gray-500 { color: #333 !important; } .text-green-400 { color: #16a34a !important; } }`}</style>

      <section className="p-10">
        <a href="/profile" className="text-gray-400 hover:text-green-400 transition mb-8 inline-block">
          &larr; Retour au profil
        </a>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold">Checklist pré-vol</h1>
          <div className="flex gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="text-sm bg-zinc-800 hover:bg-zinc-700 transition px-4 py-2 rounded-xl text-gray-300"
            >
              Imprimer
            </button>
            <button
              onClick={resetAll}
              disabled={resetting}
              className="text-sm bg-zinc-800 hover:bg-zinc-700 transition px-4 py-2 rounded-xl text-gray-300"
            >
              Tout décocher
            </button>
          </div>
        </div>

        <p className="text-indigo-400 italic text-sm mb-8">
          &ldquo;Si tu ne sais pas où est l&apos;atterro, c&apos;est que tu es en cross.&rdquo;
        </p>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>{checkedCount}/{items.length} éléments vérifiés</span>
            {allChecked && <span className="text-green-400 font-semibold">Prêt à voler !</span>}
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${items.length > 0 ? (checkedCount / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="space-y-3 mb-8">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-4 bg-zinc-900 border rounded-2xl px-5 py-4 transition ${
                item.checked ? "border-green-500 opacity-80" : "border-zinc-800"
              }`}
            >
              <button
                onClick={() => toggleItem(item)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                  item.checked
                    ? "bg-green-500 border-green-500"
                    : "border-zinc-600 hover:border-green-500"
                }`}
              >
                {item.checked && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className={`flex-1 ${item.checked ? "line-through text-gray-500" : "text-white"}`}>
                {item.label}
              </span>
              <button
                onClick={() => deleteItem(item.id)}
                className="text-zinc-600 hover:text-red-400 transition text-xs"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Ajouter un élément..."
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500"
          />
          <button
            onClick={addItem}
            className="bg-green-500 hover:bg-green-600 transition px-5 py-3 rounded-xl font-semibold"
          >
            Ajouter
          </button>
        </div>
      </section>
    </main>
  );
}
