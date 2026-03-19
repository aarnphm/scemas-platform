// LoginToSCEMAS boundary (AccessManager)
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <h1 className="text-2xl font-semibold">SCEMAS</h1>
        <p className="text-muted-foreground text-sm">smart city environmental monitoring</p>
        <LoginForm />
      </div>
    </div>
  )
}
