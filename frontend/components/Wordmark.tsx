import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

// The mark is a proofreader's caret ("insert here") over a baseline.
export default function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded text-ink no-underline">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="24" height="24" rx="4" className="fill-pencil" />
        <path d="M6.5 15 12 7.5 17.5 15" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 18.5h13" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="text-[17px] font-bold tracking-tight">{APP_NAME}</span>
    </Link>
  );
}
