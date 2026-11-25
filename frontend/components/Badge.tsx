const tones: Record<string, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  normal: "bg-slate-100 text-slate-700",
  low: "bg-slate-100 text-slate-500",
  negative: "bg-red-50 text-red-700",
  neutral: "bg-slate-100 text-slate-700",
  positive: "bg-green-100 text-green-800",
  new: "bg-blue-100 text-blue-800",
  open: "bg-amber-100 text-amber-800",
  resolved: "bg-green-100 text-green-800",
};

export default function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-xs text-slate-400">pending…</span>;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[value] ?? "bg-slate-100 text-slate-700"}`}>
      {value.replace("_", " ")}
    </span>
  );
}
