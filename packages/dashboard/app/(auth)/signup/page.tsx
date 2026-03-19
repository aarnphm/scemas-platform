// SignupForAccount boundary (AccessManager)
import { SignupForm } from '@/components/auth/signup-form'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <h1 className="text-2xl font-semibold">create account</h1>
        <p className="text-muted-foreground text-sm">join SCEMAS as an operator or admin</p>
        <SignupForm />
      </div>
    </div>
  )
}
