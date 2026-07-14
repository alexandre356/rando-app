type PageHeaderProps = {
  title: string;
  /** Petite phrase satirique en italique sous le titre */
  tagline?: string;
  /** Couleur de la tagline, ex: "text-yellow-400" (défaut vert) */
  taglineClassName?: string;
  /** Bouton(s) d'action : pleine largeur sur mobile, taille normale sur desktop */
  action?: React.ReactNode;
};

export default function PageHeader({
  title,
  tagline,
  taglineClassName = "text-green-400",
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl sm:text-5xl font-bold">{title}</h1>

      {tagline && (
        <p className={`italic text-sm mt-2 ${taglineClassName}`}>
          &ldquo;{tagline}&rdquo;
        </p>
      )}

      {action && (
        <div className="mt-4 flex flex-col sm:flex-row gap-3 [&>a]:w-full [&>button]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto [&>a]:text-center">
          {action}
        </div>
      )}
    </div>
  );
}
