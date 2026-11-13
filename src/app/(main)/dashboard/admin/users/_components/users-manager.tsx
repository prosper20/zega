"use client";

import { useState } from "react";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { BadgeCheck, Ban, Loader2, MoreHorizontal, Plus, RotateCcw, Search, Wrench } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { toast } from "sonner";

import { useConfirm } from "@/components/confirm-action";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { ResponsiveList } from "@/components/responsive-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/user-avatar";
import { ROLE_SLUGS, type RoleSlug } from "@/domain/constants";
import { ROLE_INFO } from "@/domain/permissions";
import { unwrap } from "@/lib/api-client";
import { errorMessage, toQuery, useCategories } from "@/lib/queries";

type User = {
  id: string;
  name: string;
  email: string;
  role: RoleSlug;
  department: string | null;
  matricOrStaffNo: string | null;
  banned: boolean;
  createdAt: string;
  specialties: string[];
};
const PAGE = 20;

async function send<T>(method: string, path: string, body: unknown) {
  return unwrap<T>(
    fetch(`/api${path}`, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function UsersManager({ currentUserId }: { currentUserId: string }) {
  const qc = useQueryClient();
  const [f, setF] = useQueryStates({
    q: parseAsString.withDefault(""),
    role: parseAsString.withDefault(""),
    page: parseAsInteger.withDefault(0),
  });
  const users = useQuery({
    queryKey: ["users", f],
    queryFn: () =>
      unwrap<{ data: User[]; total: number }>(
        fetch(`/api/users${toQuery({ q: f.q, role: f.role, limit: PAGE, offset: f.page * PAGE })}`, {
          credentials: "include",
        }),
      ),
    placeholderData: keepPreviousData,
  });
  const categories = useCategories();
  const [creating, setCreating] = useState(false);
  const [editingSpecs, setEditingSpecs] = useState<User | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["users"] });
  const { confirm, dialog } = useConfirm();

  async function changeRole(u: User, r: RoleSlug) {
    const ok = await confirm({
      title: `Make ${u.name} ${ROLE_INFO[r].label.toLowerCase()}?`,
      description: `They lose ${ROLE_INFO[u.role].label.toLowerCase()} access and get ${ROLE_INFO[r].label.toLowerCase()} permissions on their next request. The change is recorded in the audit trail.`,
      confirmLabel: "Change role",
    });
    if (ok) await update(u, { role: r }, `${u.name} is now ${ROLE_INFO[r].label.toLowerCase()}`);
  }

  async function setActive(u: User, active: boolean) {
    const ok = await confirm(
      active
        ? {
            title: `Reactivate ${u.name}?`,
            description: "They will be able to sign in again.",
            confirmLabel: "Reactivate",
          }
        : {
            title: `Deactivate ${u.name}?`,
            description:
              "They are signed out on every device and cannot sign in until reactivated. Their requests and history stay.",
            confirmLabel: "Deactivate",
            destructive: true,
          },
    );
    if (ok)
      await update(u, { banned: !active }, active ? `${u.name} reactivated` : `${u.name} deactivated and signed out`);
  }

  async function update(u: User, patch: Partial<Pick<User, "role" | "banned">>, message: string) {
    try {
      await send("PATCH", `/users/${u.id}`, patch);
      toast.success(message);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const renderActions = (u: User) =>
    u.id === currentUserId ? null : (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="truncate">{u.name}</DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Change role</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {ROLE_SLUGS.filter((r) => r !== u.role).map((r) => (
                <DropdownMenuItem key={r} onSelect={() => void changeRole(u, r)}>
                  {ROLE_INFO[r].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {u.role === "officer" && (
            <DropdownMenuItem onSelect={() => setEditingSpecs(u)}>
              <Wrench /> Specialties
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {u.banned ? (
            <DropdownMenuItem onSelect={() => void setActive(u, true)}>
              <RotateCcw /> Reactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" onSelect={() => void setActive(u, false)}>
              <Ban /> Deactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );

  const total = users.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={f.q}
            onChange={(e) => void setF({ q: e.target.value || null, page: null })}
            placeholder="Search name, email or ID number"
            className="h-9 pl-8"
            aria-label="Search users"
          />
        </div>
        <NativeSelect
          aria-label="Role"
          value={f.role}
          onChange={(e) => void setF({ role: e.target.value || null, page: null })}
          className="h-9 flex-1 sm:flex-none"
        >
          <NativeSelectOption value="">All roles</NativeSelectOption>
          {ROLE_SLUGS.map((r) => (
            <NativeSelectOption key={r} value={r}>
              {ROLE_INFO[r].label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button onClick={() => setCreating(true)} className="h-9 sm:ml-auto">
          <Plus data-icon="inline-start" /> Add user
        </Button>
      </div>

      <ResponsiveList
        items={users.data?.data ?? []}
        empty={
          users.isPending ? (
            <Skeleton className="h-40" />
          ) : (
            <p className="text-muted-foreground p-6 text-center text-sm">No users match.</p>
          )
        }
        table={
          <div className="bg-card overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>ID number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10 pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.isPending
                  ? Array.from({ length: 6 }, (_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-8" />
                        </TableCell>
                      </TableRow>
                    ))
                  : users.data?.data.map((u) => (
                      <TableRow key={u.id} className={u.banned ? "opacity-60" : undefined}>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar id={u.id} userRole={u.role} name={u.name} size={32} />
                            <div>
                              <div className="font-medium">{u.name}</div>
                              <div className="text-muted-foreground text-xs">{u.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                            {ROLE_INFO[u.role].label}
                          </Badge>
                          {u.role === "officer" && u.specialties.length > 0 && (
                            <div className="text-muted-foreground mt-1 text-[11px]">
                              {u.specialties
                                .map((s) => categories.data?.find((c) => c.slug === s)?.name ?? s)
                                .join(", ")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {u.department ?? <span className="text-muted-foreground">None</span>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{u.matricOrStaffNo ?? ""}</TableCell>
                        <TableCell>
                          {u.banned ? (
                            <Badge variant="destructive">Deactivated</Badge>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                              <BadgeCheck className="size-3.5" /> Active
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="pr-4">{renderActions(u)}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        }
        card={(u) => (
          <li key={u.id} className={cn("bg-card rounded-xl border p-4", u.banned && "opacity-60")}>
            <div className="flex items-start gap-3">
              <UserAvatar id={u.id} userRole={u.role} name={u.name} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{u.name}</div>
                <div className="text-muted-foreground truncate text-xs">{u.email}</div>
              </div>
              {renderActions(u)}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant={u.role === "admin" ? "default" : "secondary"}>{ROLE_INFO[u.role].label}</Badge>
              {u.banned ? (
                <Badge variant="destructive">Deactivated</Badge>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-400">Active</span>
              )}
              {u.department && <span className="text-muted-foreground">{u.department}</span>}
              {u.matricOrStaffNo && <span className="text-muted-foreground font-mono">{u.matricOrStaffNo}</span>}
            </div>
            {u.role === "officer" && u.specialties.length > 0 && (
              <p className="text-muted-foreground mt-2 text-xs">
                {u.specialties.map((sl) => categories.data?.find((c) => c.slug === sl)?.name ?? sl).join(", ")}
              </p>
            )}
          </li>
        )}
      />

      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <span>{total} users</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={f.page === 0}
            onClick={() => void setF({ page: f.page - 1 || null })}
          >
            Previous
          </Button>
          <span className="tabular-nums">
            Page {f.page + 1} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={f.page + 1 >= pages}
            onClick={() => void setF({ page: f.page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>

      {dialog}
      <CreateUserDialog open={creating} onOpenChange={setCreating} onCreated={refresh} />
      {editingSpecs && (
        <SpecialtiesDialog user={editingSpecs} onClose={() => setEditingSpecs(null)} onSaved={refresh} />
      )}
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "officer" as RoleSlug,
    department: "Works & Services",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      await send("POST", "/users", form);
      toast.success(`${form.name} added. Share the temporary password with them securely.`);
      onCreated();
      onOpenChange(false);
      setForm({ name: "", email: "", role: "officer", department: "Works & Services", password: "" });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={<>Add a user</>}
      description={<>Use this for maintenance officers and administrators, who cannot self-register.</>}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !form.name || !form.email || form.password.length < 8}>
            {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Add user
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="new-name">Full name</Label>
          <Input id="new-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="new-email">Email</Label>
          <Input id="new-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="new-role">Role</Label>
            <NativeSelect
              id="new-role"
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              className="w-full"
            >
              {ROLE_SLUGS.map((r) => (
                <NativeSelectOption key={r} value={r}>
                  {ROLE_INFO[r].label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-dept">Department</Label>
            <Input id="new-dept" value={form.department} onChange={(e) => set("department", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="new-password">Temporary password</Label>
          <div className="flex gap-2">
            <Input
              id="new-password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className="font-mono"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => set("password", `Zg-${crypto.getRandomValues(new Uint32Array(2)).join("").slice(0, 8)}a`)}
            >
              Generate
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            At least 8 characters with a letter and a number. They can change it from their profile.
          </p>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

function SpecialtiesDialog({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const categories = useCategories();
  const [chosen, setChosen] = useState<Set<string>>(new Set(user.specialties));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const ids = (categories.data ?? []).filter((c) => chosen.has(c.slug)).map((c) => c.id);
      await send("PUT", `/users/${user.id}/specialties`, { categoryIds: ids });
      toast.success("Specialties saved. Assignment suggestions now reflect them.");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResponsiveDialog
      open={true}
      onOpenChange={(v) => !v && onClose()}
      title={<>{user.name}&apos;s specialties</>}
      description={<>Officers are suggested first for requests in these categories.</>}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Save
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {categories.data?.map((c) => (
          <Label key={c.id} className="hover:bg-muted flex items-center gap-2 rounded-lg border p-2.5 font-normal">
            <Checkbox
              checked={chosen.has(c.slug)}
              onCheckedChange={(v) =>
                setChosen((s) => {
                  const n = new Set(s);
                  v ? n.add(c.slug) : n.delete(c.slug);
                  return n;
                })
              }
            />
            {c.name}
          </Label>
        ))}
      </div>
    </ResponsiveDialog>
  );
}
