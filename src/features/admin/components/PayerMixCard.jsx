import { ChartCard } from "@/components/dashboard/ChartCard";

// Share of revenue by payer, as labelled bars (easier to compare than a pie).
export function PayerMixCard({ data }) {
  const max = Math.max(...data.map((item) => item.share));

  return (
    <ChartCard title="Payer mix" description="Share of billed revenue" contentClassName="grid gap-4">
      {data.map((item) => (
        <div key={item.payer} className="grid gap-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span>{item.payer}</span>
            <span className="font-medium tabular-nums">{item.share}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-chart-1"
              style={{ width: `${(item.share / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </ChartCard>
  );
}
