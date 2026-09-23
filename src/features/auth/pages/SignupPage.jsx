import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { SignupForm } from "@/features/auth/components/SignupForm";

export function SignupPage() {
  return (
    <AuthLayout
      eyebrow="Join the care team"
      title="Create your clinician account"
      subtitle="Registration numbers are verified before patient records are unlocked."
    >
      <SignupForm />
    </AuthLayout>
  );
}
