import { Lock, ShieldCheck, Users } from "lucide-react";
import { ROLE_CONFIG } from "@/config/roles";
import { BrandMark } from "@/components/common/BrandMark";
import { HeartbeatLine } from "./HeartbeatLine";

const HIGHLIGHTS = [
  { icon: Lock, text: "Encrypted, token-based sessions" },
  { icon: ShieldCheck, text: "Role-based access to patient records" },
  { icon: Users, text: "One workspace for the whole care team" },
];

// Split layout shared by login and signup.
export function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="auth-panel relative hidden overflow-hidden text-white lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <div className="auth-grid pointer-events-none absolute inset-0" aria-hidden="true" />

        <BrandMark inverted className="relative" />

        <div className="relative space-y-8">
          <HeartbeatLine className="h-20 text-emerald-300" />
          <div className="space-y-4">
            <h2 className="max-w-md text-3xl leading-tight font-semibold tracking-tight xl:text-4xl">
              Clinical care moves fast. Your access should too.
            </h2>
            <p className="max-w-md text-white/70">
              Doctors, nurses and administrators sign in once and land exactly where
              their work begins.
            </p>
          </div>

          <ul className="space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex size-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex flex-wrap gap-2">
          {Object.values(ROLE_CONFIG).map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 ring-1 ring-white/15"
            >
              <Icon className="size-3.5" />
              {label}
            </span>
          ))}
        </div>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-8 lg:px-12">
        <BrandMark className="mb-10 lg:hidden" />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center">
          <header className="mb-8 space-y-2">
            {eyebrow && (
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                {eyebrow}
              </p>
            )}
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </header>
          {children}
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Protected health information. Access is logged and audited.
        </p>
      </main>
    </div>
  );
}
