import { Link } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldX className="size-7" />
      </span>
      <h1 className="text-2xl font-semibold">Access restricted</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your role does not have permission to view this page. Contact your administrator if you
        need access.
      </p>
      <Link to="/" className={buttonVariants()}>
        Go to my dashboard
      </Link>
    </div>
  );
}
