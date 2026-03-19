// LoginToSCEMAS boundary (AccessManager)
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <h1 className="text-2xl font-semibold text-balance">SCEMAS</h1>
        <p className="text-muted-foreground text-sm text-pretty">smart city environmental monitoring</p>
        <LoginForm />
      </div>
    </div>
  )
}
