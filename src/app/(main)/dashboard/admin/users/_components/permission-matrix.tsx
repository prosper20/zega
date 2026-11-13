import { Check, Minus } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_SLUGS } from "@/domain/constants";
import { can, PERMISSIONS, type Permission, ROLE_INFO } from "@/domain/permissions";

/** Rendered from the same permission matrix the API enforces, so it can never drift from reality. */
export function PermissionMatrix() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">What each role can do</CardTitle>
        <CardDescription>Role-based access control enforced by the API on every request.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y border-t md:hidden">
          {(Object.entries(PERMISSIONS) as [Permission, string][]).map(([key, label]) => (
            <li key={key} className="space-y-2 px-4 py-3">
              <div className="text-sm">{label}</div>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_SLUGS.filter((r) => can(r, key)).map((r) => (
                  <span
                    key={r}
                    className="bg-secondary text-secondary-foreground rounded-md px-2 py-0.5 text-xs font-medium"
                  >
                    {ROLE_INFO[r].label}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Permission</TableHead>
              {ROLE_SLUGS.map((r) => (
                <TableHead key={r} className="text-center">
                  {ROLE_INFO[r].label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(Object.entries(PERMISSIONS) as [Permission, string][]).map(([key, label]) => (
              <TableRow key={key}>
                <TableCell className="pl-6">
                  <div className="text-sm">{label}</div>
                  <code className="text-muted-foreground text-[11px]">{key}</code>
                </TableCell>
                {ROLE_SLUGS.map((r) => (
                  <TableCell key={r} className="text-center">
                    {can(r, key) ? (
                      <Check className="text-primary mx-auto size-4" aria-label="Allowed" />
                    ) : (
                      <Minus className="text-muted-foreground/40 mx-auto size-4" aria-label="Not allowed" />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
