import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { vexosApi } from "@/services/vexos-api";
import { USER_ROLES, generatePassword } from "../lib/users";
import { MfaProvisioningDialog } from "./MfaProvisioningDialog";

const MIN_PASSWORD = 12;
const blankForm = () => ({ username: "", role: "nurse", password: generatePassword(), requireMfa: true });

// POST /identity/users, then optionally POST /mfa/enable and show the provisioning secret.
export function AddUserCard({ onCreated }) {
  const [form, setForm] = useState(blankForm);
  const [pending, setPending] = useState(false);
  const [provisioning, setProvisioning] = useState(null);

  const username = form.username.trim();
  const usernameValid = /^[a-z0-9._-]{1,100}$/i.test(username);
  const passwordValid = form.password.length >= MIN_PASSWORD;

  const onSubmit = async (event) => {
    event.preventDefault();
    setPending(true);
    try {
      await vexosApi.createUser({ username, password: form.password, role: form.role });
      toast.success(`User ${username} created`, { description: "Share the temporary password securely." });
      if (form.requireMfa) {
        try {
          const result = await vexosApi.enableMfa(username);
          setProvisioning({ username, uri: result.provisioning_uri });
        } catch (error) {
          toast.error(`User created, but MFA could not be enabled: ${error.message}`);
        }
      }
      setForm(blankForm());
      onCreated?.();
    } catch (error) {
      toast.error(error.status === 409 ? `Username ${username} already exists` : error.message || "Could not create user");
    } finally {
      setPending(false);
    }
  };

  return (
    <Panel>
      <PanelHeader title="Add user" />
      <form onSubmit={onSubmit} className="grid gap-3.5 p-4">
        <div className="grid gap-1.5">
          <Label htmlFor="new-username">Username</Label>
          <Input
            id="new-username"
            value={form.username}
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            placeholder="firstname.lastname"
            autoComplete="off"
            aria-invalid={form.username !== "" && !usernameValid}
          />
          {form.username !== "" && !usernameValid && (
            <p className="text-xs text-critical">Letters, numbers, dots, dashes and underscores only.</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label>Role</Label>
          <Select items={USER_ROLES} value={form.role} onValueChange={(role) => setForm((current) => ({ ...current, role }))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USER_ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="new-password">Temporary password</Label>
          <div className="flex gap-2">
            <Input
              id="new-password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              autoComplete="new-password"
              className="font-mono"
              aria-invalid={!passwordValid}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setForm((current) => ({ ...current, password: generatePassword() }))}
              aria-label="Generate another password"
            >
              <RefreshCw />
            </Button>
          </div>
          <p className={passwordValid ? "text-xs text-muted-foreground" : "text-xs text-critical"}>
            {passwordValid
              ? "Share it securely. They can change it after signing in."
              : `At least ${MIN_PASSWORD} characters.`}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.requireMfa}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, requireMfa: checked === true }))}
          />
          Require MFA
        </label>
        <Button type="submit" disabled={pending || !usernameValid || !passwordValid}>
          {pending && <Loader2 className="animate-spin" />}
          Create user
        </Button>
      </form>
      <MfaProvisioningDialog provisioning={provisioning} onClose={() => setProvisioning(null)} />
    </Panel>
  );
}
