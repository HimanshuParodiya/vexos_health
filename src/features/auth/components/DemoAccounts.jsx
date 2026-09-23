import { ROLE_CONFIG } from "@/config/roles";
import { DEMO_ACCOUNTS } from "@/features/auth/api/auth.mock";

// Only rendered in mock mode: one-click fill for each role.
export function DemoAccounts({ onSelect }) {
  return (
    <div className="rounded-xl border border-dashed p-4">
      <p className="mb-3 text-xs font-medium text-muted-foreground">
        Demo accounts (mock API)
      </p>
      <div className="grid grid-cols-3 gap-2">
        {DEMO_ACCOUNTS.map((account) => {
          const { label, icon: Icon } = ROLE_CONFIG[account.role];
          return (
            <button
              key={account.email}
              type="button"
              onClick={() => onSelect(account)}
              className="flex flex-col items-center gap-1.5 rounded-lg border bg-card px-2 py-3 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Icon className="size-4 text-primary" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
