import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useClinicalPaths, withBed } from "@/features/unit/clinical-paths";
import { useUnitData } from "@/features/unit/unit-context";
import { cn } from "@/lib/utils";

// Top-bar search over the unit's beds (bed id, MRN or name). Ctrl+K / Cmd+K focuses it.
export function PatientSearch({ className }) {
  const { beds } = useUnitData();
  const paths = useClinicalPaths();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return beds
      .filter((bed) => bed.occupied)
      .filter((bed) => [bed.id, bed.mrn, bed.name].some((field) => field?.toLowerCase().includes(term)))
      .slice(0, 8);
  }, [beds, query]);

  const openBed = (bed) => {
    navigate(withBed(paths.flowsheet, bed.id));
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && results[highlight]) {
      event.preventDefault();
      openBed(results[highlight]);
    } else if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="patient-search-results"
        aria-label="Search bed, MRN or patient name"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        placeholder="Bed, MRN or patient name"
        className="h-9 bg-background pr-14 pl-9"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
        Ctrl K
      </kbd>

      {open && query.trim() && (
        <ul
          id="patient-search-results"
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border bg-popover py-1 shadow-md"
        >
          {results.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">No matching beds</li>}
          {results.map((bed, index) => (
            <li key={bed.id} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => openBed(bed)}
                onMouseEnter={() => setHighlight(index)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
                  index === highlight && "bg-muted"
                )}
              >
                <span className="font-mono text-xs text-muted-foreground">{bed.id}</span>
                <span className="truncate font-medium">{bed.name ?? "Unidentified patient"}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">MRN {bed.mrn}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
