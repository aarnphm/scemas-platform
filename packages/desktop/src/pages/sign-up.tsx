import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuthSignup } from '@/lib/tauri'
import { useAuthStore } from '@/store/auth'

export function SignUpPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const signup = useAuthSignup()
  const setSession = useAuthStore(s => s.setSession)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    signup.mutate(
      { email, username, password },
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
          navigate({ to: '/' })
        },
      },
    )
  }

  const inputCls =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">SCEMAS</h1>
          <p className="text-sm text-muted-foreground">create an account</p>
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
              className={inputCls}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className={inputCls}
              placeholder="username"
              required
              minLength={3}
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
              className={inputCls}
              required
              minLength={8}
            />
          </div>

          {signup.isError && <p className="text-sm text-destructive">{String(signup.error)}</p>}

          <button
            type="submit"
            disabled={signup.isPending}
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {signup.isPending ? 'creating account...' : 'sign up'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          already have an account?{' '}
          <Link to="/sign-in" className="underline hover:text-foreground">
            sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
