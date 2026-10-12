import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function secretFrom(uri) {
  try {
    return new URL(uri).searchParams.get("secret");
  } catch {
    return null;
  }
}

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Clipboard not available. Select the text and copy it manually.");
  }
}

// Shows the otpauth:// URI returned by POST /mfa/enable. The backend returns the secret only once.
export function MfaProvisioningDialog({ provisioning, onClose }) {
  const secret = provisioning ? secretFrom(provisioning.uri) : null;
  return (
    <Dialog open={provisioning != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>MFA enabled for {provisioning?.username}</DialogTitle>
          <DialogDescription>
            Give this to the user out of band (not by email). They add it to an authenticator app and then enter its 6-digit
            code at every sign-in. This is the only time the secret is shown.
          </DialogDescription>
        </DialogHeader>
        {secret && (
          <div className="grid gap-1.5">
            <p className="text-xs text-muted-foreground">Setup key</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm tracking-wider break-all">{secret}</code>
              <Button variant="outline" size="icon-sm" onClick={() => copy(secret, "Setup key")} aria-label="Copy setup key">
                <Copy />
              </Button>
            </div>
          </div>
        )}
        <div className="grid gap-1.5">
          <p className="text-xs text-muted-foreground">Provisioning URI</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-[11px] break-all">{provisioning?.uri}</code>
            <Button variant="outline" size="icon-sm" onClick={() => copy(provisioning.uri, "URI")} aria-label="Copy provisioning URI">
              <Copy />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
