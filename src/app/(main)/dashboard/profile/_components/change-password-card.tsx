"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { passwordSchema } from "@/domain/schemas/auth";
import { authClient } from "@/lib/auth-client";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords do not match." })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Choose a different password.",
  });

type Values = z.infer<typeof schema>;

const FIELDS: { name: keyof Values; label: string; autoComplete: string }[] = [
  { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
  { name: "newPassword", label: "New password", autoComplete: "new-password" },
  { name: "confirm", label: "Confirm new password", autoComplete: "new-password" },
];

export function ChangePasswordCard() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  async function onSubmit(v: Values) {
    const { error } = await authClient.changePassword({
      currentPassword: v.currentPassword,
      newPassword: v.newPassword,
      revokeOtherSessions: true,
    });
    if (error) {
      form.setError("currentPassword", { message: "Current password is incorrect." });
      return;
    }
    form.reset();
    toast.success("Password changed. Other devices have been signed out.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Changing your password signs you out everywhere else.</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup className="gap-3">
            {FIELDS.map((f) => (
              <Controller
                key={f.name}
                control={form.control}
                name={f.name}
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`pw-${f.name}`}>{f.label}</FieldLabel>
                    <Input
                      {...field}
                      id={`pw-${f.name}`}
                      type="password"
                      autoComplete={f.autoComplete}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            ))}
          </FieldGroup>
          <Button type="submit" className="w-fit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
