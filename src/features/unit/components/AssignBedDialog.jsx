import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const GENDERS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "U", label: "Unknown" },
];

// Admits a patient to a bed (POST /beds/{bed_id}/assign), or links an identity to an
// HL7-only patient already on the bed. The endpoint takes a free-form payload; we send
// { mrn, name, gender } and surface the backend's validation message if it disagrees.
export function AssignBedDialog({ bed, onOpenChange, onAssign }) {
  const linking = Boolean(bed?.occupied);
  const [form, setForm] = useState(() => ({ mrn: bed?.mrn ?? "", name: bed?.name ?? "", gender: bed?.gender ?? "U" }));
  const [pending, setPending] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const onSubmit = async (event) => {
    event.preventDefault();
    setPending(true);
    try {
      await onAssign(bed.id, { mrn: form.mrn.trim(), name: form.name.trim() || "UNKNOWN", gender: form.gender });
      toast.success(linking ? `Identity linked for ${bed.id}` : `Patient assigned to ${bed.id}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || "Could not assign bed");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={Boolean(bed)} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{linking ? `Link patient identity · ${bed?.id}` : `Assign patient · ${bed?.id}`}</DialogTitle>
            <DialogDescription>
              {linking
                ? "This bed receives monitor data without an ADT admission. Enter the patient's details to link them."
                : "Admit a patient to this bed. Monitor data for the MRN will show on the board."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="assign-mrn">MRN</Label>
              <Input id="assign-mrn" required value={form.mrn} onChange={update("mrn")} readOnly={linking} className="font-mono" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="assign-name">Patient name</Label>
              <Input id="assign-name" value={form.name} onChange={update("name")} placeholder="Full name" />
            </div>
            <div className="grid gap-1.5">
              <Label>Gender</Label>
              <Select
                items={GENDERS}
                value={form.gender}
                onValueChange={(gender) => setForm((current) => ({ ...current, gender }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((gender) => (
                    <SelectItem key={gender.value} value={gender.value}>
                      {gender.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !form.mrn.trim()}>
              {pending && <Loader2 className="animate-spin" />}
              {linking ? "Link identity" : "Assign patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
