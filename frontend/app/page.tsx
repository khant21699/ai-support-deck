import Link from "next/link";
import { ArrowRightIcon } from "@/components/Icons";
import Specimen from "@/components/Specimen";

// Who does each step. The last one is the only step a person has to do, and nothing moves without it.
const STEPS = [
  { who: "Customer", person: true, title: "Writes in", text: "The public form needs an email, a subject and a message. Nothing else." },
  { who: "AI", person: false, title: "Triages the ticket", text: "Sets category, priority and mood. If the model fails, safe defaults are used so no ticket is lost." },
  { who: "AI", person: false, title: "Drafts from your knowledge base", text: "Every sentence cites its source. With no source, the draft says so instead of guessing." },
  { who: "Agent", person: true, title: "Signs off", text: "Approve, edit or reject. The dashboard tracks how often drafts are accepted." },
];

export default function Home() {
  return (
    <>
      <section className="grid gap-12 lg:grid-cols-[1fr_minmax(0,460px)] lg:items-center lg:gap-16 lg:py-6">
        <div>
          <h1 className="text-[2.6rem] font-bold leading-[1.03] tracking-[-0.025em] md:text-6xl">
            <span className="block">AI writes the draft.</span>
            <span className="block">A person signs it off.</span>
          </h1>
          <p className="mt-6 max-w-[46ch] text-lg leading-7 text-muted">
            Every reply is written from your own knowledge base, shows where each sentence came from, and waits for an
            agent&rsquo;s approval. Nothing is sent on its own.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/submit" className="btn-primary px-5">
              Submit a ticket
            </Link>
            <Link href="/inbox" className="btn-secondary px-5">
              Open the agent inbox
              <ArrowRightIcon size={16} />
            </Link>
          </div>
        </div>
        <Specimen />
      </section>

      <section aria-labelledby="how" className="mt-16 border-t border-rule pt-10 md:mt-24">
        <h2 id="how" className="text-2xl font-bold tracking-tight">
          How a ticket moves
        </h2>
        <ol className="mt-6 max-w-3xl divide-y divide-rule border-y border-rule">
          {STEPS.map((step) => (
            <li key={step.title} className="grid gap-x-6 gap-y-1 py-5 sm:grid-cols-[96px_1fr]">
              <div>
                <span
                  className={`inline-flex rounded px-2 py-0.5 text-[12px] font-bold ${
                    step.person ? "bg-ink text-white" : "bg-pencil-wash text-pencil-dark"
                  }`}
                >
                  {step.who}
                </span>
              </div>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
