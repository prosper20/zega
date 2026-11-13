"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { GraduationCap, Loader2, UserRound } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ACCOUNT_TYPES,
  type AccountType,
  DEPARTMENT_OPTIONS,
  ID_FORMAT_HINT,
  passwordStrength,
  type RegisterInput,
  registerSchema,
} from "@/domain/schemas/auth";
import { authClient } from "@/lib/auth-client";

const ACCOUNT_TYPE_UI: Record<AccountType, { label: string; icon: typeof GraduationCap }> = {
  student: { label: "Student", icon: GraduationCap },
  staff: { label: "Staff", icon: UserRound },
};

const STRENGTH = [
  { label: "Too weak", className: "bg-destructive" },
  { label: "Weak", className: "bg-destructive" },
  { label: "Fair", className: "bg-warning" },
  { label: "Good", className: "bg-primary" },
  { label: "Strong", className: "bg-success" },
];

export function RegisterForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      accountType: "student",
      matricOrStaffNo: "",
      department: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });
  const accountType = useWatch({ control: form.control, name: "accountType" }) as AccountType;
  const password = useWatch({ control: form.control, name: "password" }) ?? "";
  const strength = passwordStrength(password);

  async function onSubmit(values: RegisterInput) {
    const parsed = registerSchema.parse(values);
    setSubmitting(true);
    const { error } = await authClient.signUp.email({
      name: parsed.name,
      email: parsed.email,
      password: parsed.password,
      department: parsed.department,
      matricOrStaffNo: parsed.matricOrStaffNo,
      phone: parsed.phone || undefined,
      // Read by the server sign-up hook to set the role (student or staff only).
      accountType: parsed.accountType,
    } as Parameters<typeof authClient.signUp.email>[0]);
    setSubmitting(false);

    if (error) {
      const message = error.message ?? "Could not create your account.";
      if (/already exists|email/i.test(message))
        form.setError("email", { message: "An account with this email already exists." });
      else if (/matric|staff/i.test(message)) form.setError("matricOrStaffNo", { message });
      toast.error(message);
      return;
    }
    toast.success("Account created. You can report your first issue now.");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="accountType"
          render={({ field }) => (
            <Field className="gap-1.5">
              <FieldLabel>I am a</FieldLabel>
              <RadioGroup
                aria-label="Account type"
                value={field.value}
                onValueChange={(type) => {
                  field.onChange(type);
                  if (form.getFieldState("matricOrStaffNo").isTouched) void form.trigger("matricOrStaffNo");
                }}
                className="grid grid-cols-2 gap-2"
              >
                {ACCOUNT_TYPES.map((type) => {
                  const ui = ACCOUNT_TYPE_UI[type];
                  return (
                    <label
                      key={type}
                      htmlFor={`account-${type}`}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                        field.value === type ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted",
                      )}
                    >
                      <RadioGroupItem id={`account-${type}`} value={type} />
                      <ui.icon className="size-4" /> {ui.label}
                    </label>
                  );
                })}
              </RadioGroup>
            </Field>
          )}
        />

        <TextField form={form} name="name" label="Full name" placeholder="Tobi Adewale" autoComplete="name" />
        <TextField
          form={form}
          name="email"
          label="Email address"
          type="email"
          placeholder="you@university.edu"
          autoComplete="email"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            form={form}
            name="matricOrStaffNo"
            label={accountType === "student" ? "Matric number" : "Staff ID"}
            placeholder={accountType === "student" ? "ZU/2023/01027" : "STF/0412"}
            description={ID_FORMAT_HINT[accountType]}
            autoComplete="off"
            className="placeholder:text-muted-foreground/60 uppercase"
          />
          <Controller
            control={form.control}
            name="department"
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="register-department">Department</FieldLabel>
                <NativeSelect id="register-department" {...field} aria-invalid={fieldState.invalid} className="w-full">
                  <NativeSelectOption value="">Select…</NativeSelectOption>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <NativeSelectOption key={d} value={d}>
                      {d}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <TextField
          form={form}
          name="phone"
          label="Phone (optional)"
          type="tel"
          placeholder="+234 803 000 0000"
          autoComplete="tel"
        />

        <div className="space-y-2">
          <TextField
            form={form}
            name="password"
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <div className="flex items-center gap-2" aria-live="polite">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    i <= strength ? STRENGTH[strength].className : "bg-muted",
                  )}
                />
              ))}
            </div>
            <span className="text-muted-foreground w-14 text-right text-xs">
              {password ? STRENGTH[strength].label : ""}
            </span>
          </div>
        </div>
        <TextField
          form={form}
          name="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
        />
      </FieldGroup>

      <Button className="h-10 w-full" type="submit" disabled={submitting}>
        {submitting && <Loader2 className="animate-spin" data-icon="inline-start" />}
        Create account
      </Button>
      <p className="text-muted-foreground text-center text-xs">
        Maintenance officers and administrators are added by an administrator.
      </p>
    </form>
  );
}

function TextField({
  form,
  name,
  label,
  description,
  className,
  ...input
}: {
  form: ReturnType<typeof useForm<RegisterInput>>;
  name: "name" | "email" | "matricOrStaffNo" | "phone" | "password" | "confirmPassword";
  label: string;
  description?: string;
} & Omit<React.ComponentProps<typeof Input>, "form" | "name">) {
  const id = `register-${name}`;
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field className="gap-1.5" data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...input}
            {...field}
            value={field.value ?? ""}
            id={id}
            aria-invalid={fieldState.invalid}
            className={className}
          />
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : (
            description && <FieldDescription className="text-xs">{description}</FieldDescription>
          )}
        </Field>
      )}
    />
  );
}
