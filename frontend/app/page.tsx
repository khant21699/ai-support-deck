import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-12 text-center">
      <h1 className="text-3xl font-bold">AI-assisted support desk</h1>
      <p className="text-slate-600">
        Tickets are triaged automatically and answered with drafts grounded in your knowledge base.
        A human reviews every reply before it is sent.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/submit" className="btn-primary">Submit a ticket</Link>
        <Link href="/inbox" className="btn-ghost">Agent inbox</Link>
      </div>
    </div>
  );
}
