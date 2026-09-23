import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { LoginForm } from "@/features/auth/components/LoginForm";

export function LoginPage() {
  return (
    <AuthLayout
      eyebrow="Care team portal"
      title="Sign in to your workspace"
      subtitle="Your role determines which dashboard opens after sign in."
    >
      <LoginForm />
    </AuthLayout>
  );
}
