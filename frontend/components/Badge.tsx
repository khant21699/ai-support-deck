import { label } from "@/lib/format";

const priorityTicks: Record<string, number> = { low: 1, normal: 2, high: 3, urgent: 4 };

/** Priority as four ticks plus the word, so it never relies on color alone. */
export function PriorityMark({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-[13px] text-muted">Not set</span>;
  const filled = priorityTicks[value] ?? 2;
  const urgent = value === "urgent";
  return (
    <span className={`inline-flex items-center gap-2 text-[13px] font-semibold ${urgent ? "text-proof" : "text-ink"}`}>
      <span className="flex items-end gap-[2px]" aria-hidden="true">
        {[1, 2, 3, 4].map((tick) => (
          <span
            key={tick}
            style={{ height: 5 + tick * 2 }}
            className={`w-[3px] rounded-[1px] ${tick <= filled ? (urgent ? "bg-proof" : "bg-ink") : "bg-rule-strong/60"}`}
          />
        ))}
      </span>
      {label(value)}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  new: "bg-pencil-wash text-pencil-dark",
  open: "bg-paper text-ink ring-1 ring-inset ring-rule-strong",
  resolved: "bg-done-wash text-done",
};

export function StatusChip({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[12px] font-semibold ${statusStyles[value] ?? statusStyles.open}`}>
      {label(value)}
    </span>
  );
}

/** Category and sentiment are plain words. They only get a chip when the AI has not set them yet. */
export function Plain({ value, tone }: { value: string | null | undefined; tone?: "negative" }) {
  if (!value) return <span className="text-[13px] text-muted">Not set</span>;
  return <span className={`text-[13px] ${tone === "negative" && value === "negative" ? "font-semibold text-proof" : "text-ink"}`}>{label(value)}</span>;
}
