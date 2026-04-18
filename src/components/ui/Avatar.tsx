const GRADIENTS = [
  "from-moat-500 to-moat-700",
  "from-sky-500 to-indigo-600",
  "from-rose-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({
  name,
  size = 28,
}: {
  name: string;
  size?: number;
}) {
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  const grad = GRADIENTS[hash(name) % GRADIENTS.length];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${grad} text-white font-semibold ring-1 ring-white/60 shadow-sm`}
      style={{ width: size, height: size, fontSize: Math.floor(size * 0.42) }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
