import { useState } from "react";
import { Loader2, MoreHorizontal, Search } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { Panel, PanelHeader } from "@/components/common/Panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDayTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { vexosApi } from "@/services/vexos-api";
import { USER_ROLES, lastSignInByUser, roleLabel } from "../lib/users";
import { MfaProvisioningDialog } from "./MfaProvisioningDialog";

const ROLE_FILTERS = [{ value: "all", label: "All roles" }, ...USER_ROLES];

// Local accounts with deactivate/reactivate and MFA actions (admin only).
export function UsersTable({ users, attempts, loading, onChanged, currentUsername }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const [busy, setBusy] = useState(null);
  const [provisioning, setProvisioning] = useState(null); // { username, uri }

  const lastSignIn = lastSignInByUser(attempts);
  const visible = (users ?? [])
    .filter((user) => roleFilter === "all" || user.role === roleFilter)
    .filter((user) => user.username.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.username.localeCompare(b.username));
  const activeCount = (users ?? []).filter((user) => user.is_active).length;

  const run = async (username, action, success) => {
    setBusy(username);
    try {
      const result = await action();
      if (success) toast.success(success);
      onChanged?.();
      return result;
    } catch (error) {
      toast.error(error.message || "Action failed");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const enableMfa = async (username) => {
    const result = await run(username, () => vexosApi.enableMfa(username));
    if (result?.provisioning_uri) setProvisioning({ username, uri: result.provisioning_uri });
  };

  return (
    <Panel>
      <PanelHeader
        title="Users"
        meta={`· ${activeCount} active`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search username"
                aria-label="Search username"
                className="h-8 w-44 pl-8 text-sm"
              />
            </div>
            <Select items={ROLE_FILTERS} value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger size="sm" className="min-w-28" aria-label="Filter by role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-2 p-4">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState title="No users match" description="Change the search or role filter." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="pl-4 font-normal text-muted-foreground">User</TableHead>
              <TableHead className="font-normal text-muted-foreground">Role</TableHead>
              <TableHead className="font-normal text-muted-foreground">Last sign-in</TableHead>
              <TableHead className="font-normal text-muted-foreground">Status</TableHead>
              <TableHead className="pr-4 text-right font-normal text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((user) => {
              const isSelf = user.username === currentUsername;
              return (
                <TableRow key={user.username} className={cn(!user.is_active && "bg-muted/50 text-muted-foreground")}>
                  <TableCell className="pl-4">
                    <p className="font-semibold">{user.username}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      since {formatDayTime(user.created_at, { alwaysShowDate: true })}
                    </p>
                  </TableCell>
                  <TableCell>{roleLabel(user.role)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {lastSignIn[user.username] ? formatDayTime(lastSignIn[user.username]) : "–"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[11px] font-medium",
                        user.is_active ? "bg-good-surface text-good" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {user.is_active ? "Active" : "Deactivated"}
                    </span>
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {busy === user.username && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                      {user.is_active ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-critical/40 text-critical hover:bg-critical-surface hover:text-critical"
                          disabled={isSelf || busy === user.username}
                          title={isSelf ? "You cannot deactivate your own account" : undefined}
                          onClick={() => setConfirmDeactivate(user.username)}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy === user.username}
                          onClick={() => run(user.username, () => vexosApi.reactivateUser(user.username), `${user.username} reactivated`)}
                        >
                          Reactivate
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${user.username}`} />}
                        >
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => enableMfa(user.username)}>Enable MFA…</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => run(user.username, () => vexosApi.disableMfa(user.username), `MFA disabled for ${user.username}`)}
                          >
                            Disable MFA
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={confirmDeactivate != null} onOpenChange={(open) => !open && setConfirmDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {confirmDeactivate}?</AlertDialogTitle>
            <AlertDialogDescription>
              They are signed out everywhere straight away and cannot sign in again until you reactivate them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const username = confirmDeactivate;
                setConfirmDeactivate(null);
                run(username, () => vexosApi.deactivateUser(username), `${username} deactivated`);
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MfaProvisioningDialog provisioning={provisioning} onClose={() => setProvisioning(null)} />
    </Panel>
  );
}
