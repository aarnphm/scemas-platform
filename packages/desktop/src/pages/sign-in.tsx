import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuthLogin } from '@/lib/tauri'
import { useAuthStore } from '@/store/auth'

function landingPath(role: string): string {
  switch (role) {
    case 'admin':
      return '/rules'
    case 'operator':
      return '/dashboard'
    default:
      return '/display'
  }
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useAuthLogin()
  const setSession = useAuthStore(s => s.setSession)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login.mutate(
      { email, password },
      {
        onSuccess: data => {
          const session = data as {
            token: string
            user: {
              id: string
              email: string
              username: string
              role: 'admin' | 'operator' | 'viewer'
            }
          }
          setSession(session.token, session.user)
          navigate({ to: landingPath(session.user.role) })
        },
      },
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">SCEMAS</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="operator@scemas.local"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            />
          </div>

          {login.isError && <p className="text-sm text-destructive">{String(login.error)}</p>}

          <button
            type="submit"
            disabled={login.isPending}
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {login.isPending ? 'signing in...' : 'sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          no account?{' '}
          <Link to="/sign-up" className="underline hover:text-foreground">
            sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
