import { Construction } from "lucide-react";
import { useLocation } from "react-router-dom";

// Temporary target for sidebar links whose module is not built yet.
export function ComingSoonPage() {
  const { pathname } = useLocation();
  const section = pathname.split("/").pop().replace(/-/g, " ");

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-16 text-center">
      <Construction className="size-8 text-muted-foreground" />
      <h1 className="text-lg font-semibold capitalize">{section}</h1>
      <p className="text-sm text-muted-foreground">This module is coming soon.</p>
    </div>
  );
}
