import { cn } from "@/lib/utils";

// Decorative ECG trace used on the auth screens.
export function HeartbeatLine({ className }) {
  return (
    <svg
      viewBox="0 0 600 120"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("w-full", className)}
    >
      <path
        className="ecg-trace"
        d="M0 60 H140 L160 60 L172 40 L184 60 H220 L236 60 L248 8 L262 112 L276 30 L288 60 H340 L356 60 L370 48 L386 60 H600"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1"
      />
    </svg>
  );
}
