import Link from "next/link";

/** MediGuardian mark — a shield enclosing a medical cross (protection + care). */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-600 shadow-sm"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2.6 L18.4 5.2 V10.8 C18.4 15 15.6 17.9 12 19.4 C8.4 17.9 5.6 15 5.6 10.8 V5.2 Z"
          fill="#ffffff"
        />
        <path d="M12 8.2 V15 M8.6 11.6 H15.4" stroke="#4f46e5" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function BrandLockup({ href = "/", size = 36 }: { href?: string; size?: number }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <Logo size={size} />
      <span className="text-lg font-bold tracking-tight text-brand-900">
        MediGuardian<span className="text-brand-600"> AI</span>
      </span>
    </Link>
  );
}

/** Shown wherever the AI makes a clinical-sounding statement. */
export function MedicalDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      className={`rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 ${className}`}
    >
      <strong className="font-semibold">Information only, not a diagnosis.</strong>{" "}
      MediGuardian AI reads your uploaded documents and highlights things worth
      checking. Always confirm with a qualified doctor or pharmacist.
    </p>
  );
}
