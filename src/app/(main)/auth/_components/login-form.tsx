"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, Loader2, ShieldCheck, UserRound, Wrench } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type LoginInput, loginSchema } from "@/domain/schemas/auth";
import { authClient } from "@/lib/auth-client";

const DEMO = [
  { label: "Student", email: "student@zega.test", icon: GraduationCap },
  { label: "Staff", email: "staff@zega.test", icon: UserRound },
  { label: "Officer", email: "officer@zega.test", icon: Wrench },
  { label: "Admin", email: "admin@zega.test", icon: ShieldCheck },
] as const;
const DEMO_PASSWORD = "Zega@2026!";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  async function login(values: LoginInput, key = "form") {
    setPending(key);
    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: values.remember ?? true,
    });
    if (error) {
      setPending(null);
      if (error.status === 429) {
        const message = "Too many attempts. Please wait a minute and try again.";
        form.setError("root", { message });
        toast.error(message);
      } else {
        form.setError("password", { message: "Incorrect email or password." });
        toast.error("Incorrect email or password.");
      }
      return;
    }
    toast.success(`Welcome back, ${data?.user.name.split(" ")[0] ?? ""}`.trim());
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form noValidate onSubmit={form.handleSubmit((v) => login(v))} className="flex flex-col gap-4">
        <FieldGroup className="gap-4">
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="login-email">Email address</FieldLabel>
                <Input
                  {...field}
                  id="login-email"
                  type="email"
                  placeholder="you@university.edu"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="login-password">Password</FieldLabel>
                <Input
                  {...field}
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="remember"
            render={({ field }) => (
              <Field orientation="horizontal">
                <Checkbox
                  id="login-remember"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                />
                <FieldContent>
                  <FieldLabel htmlFor="login-remember" className="font-normal">
                    Keep me signed in on this device
                  </FieldLabel>
                </FieldContent>
              </Field>
            )}
          />
        </FieldGroup>
        {form.formState.errors.root && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button className="h-10 w-full" type="submit" disabled={pending !== null}>
          {pending === "form" && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Log in
        </Button>
      </form>

      <div className="space-y-3">
        <div className="after:border-border relative text-center text-xs after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2">Or try a demo account</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DEMO.map((d) => (
            <Button
              key={d.email}
              type="button"
              variant="outline"
              className="h-9 justify-start"
              disabled={pending !== null}
              onClick={() => login({ email: d.email, password: DEMO_PASSWORD, remember: false }, d.email)}
            >
              {pending === d.email ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <d.icon data-icon="inline-start" />
              )}
              {d.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
