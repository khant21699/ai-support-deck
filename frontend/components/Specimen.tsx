// A static, labelled example of what an agent sees: the customer's message, the AI draft with
// footnoted sources, and the sign-off. It is sample content, not live data.
function Marker({ n }: { n: number }) {
  return <sup className="ml-0.5 text-[11px] font-bold text-pencil">{n}</sup>;
}

export default function Specimen() {
  return (
    <figure className="motion-safe:animate-land">
      <div className="panel overflow-hidden shadow-slip">
        <div className="border-b border-rule px-5 py-4">
          <p className="text-[13px] font-semibold text-muted">Customer message</p>
          <p className="mt-1.5 font-serif text-[16px] leading-relaxed">
            I bought the annual plan 9 days ago and it isn&rsquo;t what I needed. Can I get my money back?
          </p>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-semibold text-muted">AI draft</p>
            <p className="text-[13px] text-muted">Waiting for sign-off</p>
          </div>
          <p className="mt-1.5 font-serif text-[16px] leading-relaxed">
            You can request a full refund within 14 days of purchase.
            <Marker n={1} /> The money goes back to your original payment method and usually arrives in 5 to 10 business days.
            <Marker n={1} />
          </p>

          <ol className="mt-4 border-t border-rule pt-3 text-[13px] leading-5 text-muted">
            <li>
              <span className="font-bold text-pencil">1</span> <span className="font-semibold text-ink">Refund policy:</span> You can
              request a full refund within 14 days of purchase.
            </li>
          </ol>
        </div>

        <div aria-hidden="true" className="flex items-center gap-2 border-t border-rule bg-paper/60 px-5 py-3">
          <span className="inline-flex h-9 items-center rounded bg-pencil px-4 text-sm font-semibold text-white">Approve and send</span>
          <span className="inline-flex h-9 items-center rounded border border-rule-strong bg-slip px-4 text-sm font-semibold">Edit</span>
          <span className="inline-flex h-9 items-center rounded border border-proof/40 bg-slip px-4 text-sm font-semibold text-proof">Reject</span>
        </div>
      </div>
      <figcaption className="mt-3 text-[13px] text-muted">Example with sample text. Nothing is sent until an agent signs off.</figcaption>
    </figure>
  );
}
