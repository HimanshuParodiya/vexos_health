import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getDashboardPath, ROLES, SIGNUP_ROLES } from "@/config/roles";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { DEPARTMENTS, signupSchema } from "@/features/auth/schemas/auth.schemas";
import { applyServerErrors } from "@/features/auth/utils/form-errors";
import { FormField } from "./FormField";
import { PasswordInput } from "./PasswordInput";
import { PasswordStrength } from "./PasswordStrength";
import { RolePicker } from "./RolePicker";

// Role-specific wording for the professional credential field.
const LICENSE_COPY = {
  [ROLES.DOCTOR]: {
    label: "Medical registration number",
    placeholder: "e.g. NMC-123456",
    hint: "Issued by your medical council. Verified before activation.",
  },
  [ROLES.NURSE]: {
    label: "Nursing council registration number",
    placeholder: "e.g. RN-789012",
    hint: "Issued by your nursing council. Verified before activation.",
  },
};

export function SignupForm() {
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: ROLES.DOCTOR,
      fullName: "",
      email: "",
      phone: "",
      licenseNumber: "",
      department: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const role = useWatch({ control, name: "role" });
  const password = useWatch({ control, name: "password" });
  const license = LICENSE_COPY[role] ?? LICENSE_COPY[ROLES.DOCTOR];

  const onSubmit = async ({ confirmPassword: _confirm, acceptTerms: _terms, ...payload }) => {
    setFormError(null);
    try {
      const user = await registerAccount(payload);
      toast.success("Account created", { description: `Signed in as ${user.fullName}` });
      navigate(getDashboardPath(user.role), { replace: true });
    } catch (error) {
      setFormError(applyServerErrors(error, setError));
    }
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6">
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {formError}
          </div>
        )}

        <section className="grid gap-3">
          <StepHeading step={1} title="Your role" />
          <Controller
            name="role"
            control={control}
            render={({ field, fieldState }) => (
              <RolePicker
                roles={SIGNUP_ROLES}
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(fieldState.error)}
              />
            )}
          />
          {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Administrator accounts are issued by your hospital's IT team.
          </p>
        </section>

        <Separator />

        <section className="grid gap-4">
          <StepHeading step={2} title="Professional details" />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="fullName"
              label="Full name"
              error={errors.fullName?.message}
              className="sm:col-span-2"
            >
              {(field) => (
                <Input
                  {...field}
                  {...register("fullName")}
                  autoComplete="name"
                  placeholder={role === ROLES.DOCTOR ? "Dr. Jane Doe" : "Jane Doe"}
                />
              )}
            </FormField>

            <FormField id="email" label="Work email" error={errors.email?.message}>
              {(field) => (
                <Input
                  {...field}
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="name@hospital.org"
                />
              )}
            </FormField>

            <FormField id="phone" label="Phone" error={errors.phone?.message}>
              {(field) => (
                <Input
                  {...field}
                  {...register("phone")}
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                />
              )}
            </FormField>

            <FormField
              id="licenseNumber"
              label={license.label}
              error={errors.licenseNumber?.message}
              hint={license.hint}
            >
              {(field) => (
                <Input
                  {...field}
                  {...register("licenseNumber")}
                  placeholder={license.placeholder}
                  className="uppercase placeholder:normal-case"
                />
              )}
            </FormField>

            <FormField id="department" label="Department" error={errors.department?.message}>
              {({ id, ...aria }) => (
                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || null} onValueChange={field.onChange}>
                      <SelectTrigger id={id} {...aria} onBlur={field.onBlur} className="w-full">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((department) => (
                          <SelectItem key={department} value={department}>
                            {department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FormField>
          </div>
        </section>

        <Separator />

        <section className="grid gap-4">
          <StepHeading step={3} title="Secure your account" />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="password" label="Password" error={errors.password?.message}>
              {(field) => (
                <PasswordInput
                  {...field}
                  {...register("password")}
                  autoComplete="new-password"
                  placeholder="Create a password"
                />
              )}
            </FormField>

            <FormField
              id="confirmPassword"
              label="Confirm password"
              error={errors.confirmPassword?.message}
            >
              {(field) => (
                <PasswordInput
                  {...field}
                  {...register("confirmPassword")}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                />
              )}
            </FormField>
          </div>
          <PasswordStrength value={password} />

          <Controller
            name="acceptTerms"
            control={control}
            render={({ field, fieldState }) => (
              <div className="grid gap-1">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="acceptTerms"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-invalid={fieldState.error ? true : undefined}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="acceptTerms"
                    className="leading-snug font-normal text-muted-foreground"
                  >
                    I agree to the Terms of Use and will handle patient data according to
                    the hospital's confidentiality policy.
                  </Label>
                </div>
                {fieldState.error && (
                  <p className="text-xs text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        </section>

        <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" /> Creating account…
            </>
          ) : (
            <>
              Create account <ArrowRight />
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function StepHeading({ step, title }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-medium">
      <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
        {step}
      </span>
      {title}
    </h2>
  );
}
