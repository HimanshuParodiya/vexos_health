import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { env } from "@/config/env";
import { getDashboardPath } from "@/config/roles";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { loginSchema } from "@/features/auth/schemas/auth.schemas";
import { applyServerErrors } from "@/features/auth/utils/form-errors";
import { DemoAccounts } from "./DemoAccounts";
import { FormField } from "./FormField";
import { PasswordInput } from "./PasswordInput";

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberDevice: false },
  });

  const rememberDevice = useWatch({ control, name: "rememberDevice" });

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      const user = await login({ email: values.email, password: values.password });
      toast.success(`Welcome back, ${user.fullName}`);

      // Return to the page the user tried to open, but only if it belongs to their role.
      const dashboard = getDashboardPath(user.role);
      const from = location.state?.from?.pathname;
      navigate(from?.startsWith(dashboard) ? from : dashboard, { replace: true });
    } catch (error) {
      setFormError(applyServerErrors(error, setError));
    }
  };

  const fillDemo = (account) => {
    setValue("email", account.email, { shouldValidate: true });
    setValue("password", account.password, { shouldValidate: true });
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {formError}
          </div>
        )}

        <FormField id="email" label="Work email" error={errors.email?.message}>
          {(field) => (
            <Input
              {...field}
              {...register("email")}
              type="email"
              autoComplete="username"
              placeholder="name@hospital.org"
              className="h-11"
            />
          )}
        </FormField>

        <FormField
          id="password"
          label="Password"
          error={errors.password?.message}
          action={
            <Link to="#" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          }
        >
          {(field) => (
            <PasswordInput
              {...field}
              {...register("password")}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="h-11"
            />
          )}
        </FormField>

        <div className="flex items-center gap-2">
          <Checkbox
            id="rememberDevice"
            checked={rememberDevice}
            onCheckedChange={(checked) => setValue("rememberDevice", checked)}
          />
          <Label htmlFor="rememberDevice" className="font-normal text-muted-foreground">
            This is a trusted workstation
          </Label>
        </div>

        <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" /> Verifying credentials…
            </>
          ) : (
            <>
              Sign in securely <ArrowRight />
            </>
          )}
        </Button>
      </form>

      {env.useMockApi && <DemoAccounts onSelect={fillDemo} />}

      <p className="text-center text-sm text-muted-foreground">
        New to the care team?{" "}
        <Link to={ROUTES.SIGNUP} className="font-medium text-primary hover:underline">
          Request an account
        </Link>
      </p>
    </div>
  );
}
