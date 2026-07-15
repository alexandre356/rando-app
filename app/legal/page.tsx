import Navbar from "../../components/Navbar";

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="p-5 sm:p-10 space-y-16">

        <div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-2">Informations légales</h1>
          <p className="text-gray-400">Dernière mise à jour : juillet 2026</p>
        </div>

        {/* AVERTISSEMENT SECURITE */}
        <div className="bg-red-950 border border-red-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-red-400 mb-4">⚠️ Avertissement de sécurité</h2>
          <p className="text-red-200 leading-relaxed mb-4">
            Le parapente et le hike & fly sont des <strong>activités à risque</strong> pouvant entraîner des blessures graves ou le décès. Les informations présentes sur Marche&Plouf sont fournies à titre <strong>indicatif uniquement</strong>.
          </p>
          <ul className="text-red-200 space-y-2 text-sm list-disc list-inside">
            <li>Les topos et itinéraires ne remplacent pas une formation auprès d&apos;un moniteur qualifié FFVL.</li>
            <li>Les conditions météo, l&apos;état du terrain, et votre niveau de pilotage restent de votre seule responsabilité.</li>
            <li>Vérifiez toujours les conditions locales avant de voler.</li>
            <li>Marche&Plouf ne peut être tenu responsable d&apos;un accident ou incident survenu lors d&apos;une activité basée sur les informations du site.</li>
          </ul>
        </div>

        {/* MENTIONS LEGALES */}
        <div>
          <h2 className="text-3xl font-bold mb-6 text-green-400">Mentions légales</h2>
          <div className="grid md:grid-cols-2 gap-4 text-gray-300">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-2">Éditeur du site</h3>
              <p>Marche&Plouf est un projet communautaire indépendant dédié à la pratique du Hike & Fly en France et dans les Alpes.</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-2">Hébergement</h3>
              <p>Ce site est hébergé par <strong>Vercel Inc.</strong>, 340 Pine Street, Suite 701, San Francisco, CA 94104, États-Unis.</p>
              <p className="mt-1">La base de données est hébergée par <strong>Supabase</strong> (région Europe).</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-2">Contact</h3>
              <p>Pour toute question, signalement ou demande de suppression de données, contactez-nous via le forum ou par email.</p>
            </div>
          </div>
        </div>

        {/* CGU */}
        <div>
          <h2 className="text-3xl font-bold mb-6 text-green-400">Conditions Générales d&apos;Utilisation</h2>
          <div className="grid md:grid-cols-2 gap-4 text-gray-300 leading-relaxed">

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-3">1. Objet</h3>
              <p>Marche&Plouf est une plateforme communautaire permettant aux pilotes de parapente de partager des itinéraires de randonnée Hike & Fly, des sorties et des informations sur les spots de vol. L&apos;utilisation du site implique l&apos;acceptation des présentes CGU.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-3">2. Contenu utilisateur</h3>
              <p>En publiant du contenu sur Marche&Plouf (itinéraires, photos, commentaires, sorties), vous certifiez :</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Être l&apos;auteur du contenu ou avoir les droits nécessaires pour le publier.</li>
                <li>Que le contenu est exact et ne met pas en danger d&apos;autres utilisateurs.</li>
                <li>Que le contenu ne contient pas d&apos;informations illégales, diffamatoires ou offensantes.</li>
              </ul>
              <p className="mt-3">Marche&Plouf se réserve le droit de supprimer tout contenu ne respectant pas ces règles.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-3">3. Responsabilité</h3>
              <p>Marche&Plouf est une plateforme de partage communautaire. Les informations publiées sont fournies par des utilisateurs bénévoles et peuvent être incomplètes, inexactes ou obsolètes.</p>
              <p className="mt-2"><strong className="text-white">Marche&Plouf décline toute responsabilité</strong> quant à l&apos;utilisation des informations présentes sur le site, notamment en cas d&apos;accident, de blessure, ou de dommage matériel survenu lors d&apos;une pratique du hike & fly.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-3">4. Modération</h3>
              <p>Les itinéraires et spots soumis sont validés par un administrateur avant publication. Les sorties et commentaires sont publiés directement mais peuvent être supprimés en cas de signalement ou de non-respect des CGU.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-3">5. Propriété intellectuelle</h3>
              <p>Les contenus publiés sur Marche&Plouf (textes, photos, traces GPX) restent la propriété de leurs auteurs. En les publiant, vous accordez à Marche&Plouf une licence non-exclusive d&apos;utilisation et d&apos;affichage sur la plateforme.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-3">6. Modification des CGU</h3>
              <p>Marche&Plouf se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications importantes.</p>
            </div>
          </div>
        </div>

        {/* POLITIQUE DE CONFIDENTIALITÉ */}
        <div>
          <h2 className="text-3xl font-bold mb-6 text-green-400">Politique de confidentialité</h2>
          <div className="grid md:grid-cols-2 gap-4 text-gray-300 leading-relaxed">

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-3">Données collectées</h3>
              <p>Lors de votre inscription et utilisation de Marche&Plouf, nous collectons :</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li><strong className="text-white">Adresse email</strong> — pour l&apos;authentification</li>
                <li><strong className="text-white">Pseudo</strong> — affiché publiquement sur vos contributions</li>
                <li><strong className="text-white">Contenu publié</strong> — topos, sorties, commentaires, photos</li>
                <li><strong className="text-white">Journal de vol et matériel</strong> — données privées, accessibles uniquement par vous</li>
              </ul>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-3">Utilisation des données</h3>
              <p>Vos données sont utilisées uniquement pour faire fonctionner la plateforme. Elles ne sont <strong className="text-white">jamais vendues ni partagées</strong> avec des tiers à des fins commerciales.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-3">Vos droits (RGPD)</h3>
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li><strong className="text-white">Accès</strong> — consulter les données que nous détenons sur vous</li>
                <li><strong className="text-white">Rectification</strong> — corriger vos informations</li>
                <li><strong className="text-white">Suppression</strong> — demander la suppression de votre compte et données</li>
                <li><strong className="text-white">Portabilité</strong> — récupérer vos données dans un format lisible</li>
              </ul>
              <p className="mt-3">Pour exercer ces droits, contactez-nous via le forum.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-3">Cookies</h3>
              <p>Marche&Plouf utilise uniquement des cookies techniques nécessaires au fonctionnement de l&apos;authentification. Aucun cookie publicitaire ou de tracking n&apos;est utilisé.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-3">Hébergement et sécurité</h3>
              <p>Vos données sont hébergées en Europe sur des serveurs sécurisés (Supabase). Les mots de passe sont chiffrés et jamais stockés en clair.</p>
            </div>
          </div>
        </div>

        <p className="text-gray-600 text-sm text-center pb-10">
          Marche&Plouf — Communauté Hike & Fly 🪂 — {new Date().getFullYear()}
        </p>

      </section>
    </main>
  );
}
