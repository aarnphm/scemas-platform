import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'sign in' }

// LoginToSCEMAS boundary (AccessManager)
export default function SignInPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-balance">SCEMAS</h1>
      </div>
      <LoginForm />
    </div>
  )
}
