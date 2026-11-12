import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitials } from "@/lib/utils";
import type { CurrentUser } from "@/server/session";

import { ROLE_LABEL } from "../../_components/user-types";

export function ProfileDetails({ user }: { user: CurrentUser }) {
  const rows = [
    { label: "Email", value: user.email },
    { label: user.role === "student" ? "Matric number" : "Staff ID", value: user.matricOrStaffNo },
    { label: "Department", value: user.department },
  ].filter((r) => r.value);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="size-14 rounded-xl">
          <AvatarFallback className="bg-primary text-primary-foreground rounded-xl text-lg font-semibold">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <CardTitle className="text-lg">{user.name}</CardTitle>
          <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="divide-y text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="truncate text-right font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
