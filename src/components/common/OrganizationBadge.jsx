import { useState } from "react";
import { Building2 } from "lucide-react";
import { DEFAULT_ORGANIZATION } from "@/config/organization";
import { cn } from "@/lib/utils";

// Customer organization logo + name. Falls back to an icon if the logo is missing or fails.
export function OrganizationBadge({ organization, className }) {
  const { name, logoUrl } = { ...DEFAULT_ORGANIZATION, ...organization };
  const [failedUrl, setFailedUrl] = useState(null);
  const showLogo = logoUrl && failedUrl !== logoUrl;

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background">
        {showLogo ? (
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className="size-full object-contain p-1"
            onError={() => setFailedUrl(logoUrl)}
          />
        ) : (
          <Building2 className="size-4 text-primary" aria-hidden="true" />
        )}
      </span>
      <span className="hidden min-w-0 lg:grid">
        <span className="truncate text-sm leading-tight font-medium">{name}</span>
        <span className="text-xs leading-tight text-muted-foreground">Organization</span>
      </span>
    </div>
  );
}
