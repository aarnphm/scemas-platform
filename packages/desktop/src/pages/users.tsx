import { type FormEvent, useState } from 'react'
import { useTauriQuery, useTauriMutation } from '@/lib/tauri'

type Role = 'admin' | 'operator' | 'viewer'

interface User {
  id: string
  email: string
  username: string
  role: Role
  createdAt: string
}

interface ActiveSession {
  tokenValue: string
  username: string
  role: string
  expiry: string
}

const roles: Role[] = ['operator', 'admin', 'viewer']

const ROLE_CLS: Record<string, string> = {
  admin: 'bg-purple-500/15 text-purple-700',
  operator: 'bg-blue-500/15 text-blue-700',
  viewer: 'bg-secondary text-muted-foreground',
}

function isRole(value: string): value is Role {
  return (roles as string[]).includes(value)
}

export function UsersPage() {
  const users = useTauriQuery<User[]>('users_list', {})
  const sessions = useTauriQuery<ActiveSession[]>('users_active_sessions', {})

  const createUser = useTauriMutation<{ email: string; username: string; password: string }>(
    'auth_signup',
    ['users_list'],
  )

  const updateRole = useTauriMutation<{ args: { userId: string; role: Role } }>(
    'users_update_role',
    ['users_list'],
  )

  const deleteUser = useTauriMutation<{ args: { userId: string } }>('users_delete', ['users_list'])

  const revokeSession = useTauriMutation<{ args: { tokenValue: string } }>('users_revoke_session', [
    'users_active_sessions',
  ])

  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmissionError(null)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email'))
    const username = String(formData.get('username'))
    const password = String(formData.get('password'))
    const role = String(formData.get('role'))

    if (!isRole(role)) {
      setSubmissionError('invalid role selected')
      return
    }

    if (username.length < 3) {
      setSubmissionError('username must be at least 3 characters')
      return
    }

    if (password.length < 8) {
      setSubmissionError('password must be at least 8 characters')
      return
    }

    createUser.mutate(
      { email, username, password },
      {
        onSuccess: () => setSubmissionError(null),
        onError: () => setSubmissionError('failed to create account'),
      },
    )

    event.currentTarget.reset()
  }

  if (users.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">loading users...</p>
  }

  const allUsers = users.data ?? []
  const allSessions = sessions.data ?? []
  const expiringCount = allSessions.filter(
    s => new Date(s.expiry).getTime() - Date.now() < 3_600_000,
  ).length

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-balance">user management</h1>
        <p className="text-sm text-muted-foreground">
          manage which dashboard each account can reach and which control surfaces they can touch
        </p>
      </div>

      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">active sessions</span>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground/50">
              {allSessions.length}
            </span>
          </div>
          {expiringCount > 0 && (
            <span className="text-xs text-amber-600">{expiringCount} expiring within 1h</span>
          )}
        </div>
        {sessions.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">loading sessions...</p>
        ) : allSessions.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">no active sessions</p>
        ) : (
          <div className="divide-y">
            {allSessions.map(session => (
              <div key={session.tokenValue} className="flex h-14 items-center justify-between px-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{session.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.role} · expires {new Date(session.expiry).toLocaleString()}
                  </p>
                </div>
                <button
                  disabled={revokeSession.isPending}
                  onClick={() => revokeSession.mutate({ args: { tokenValue: session.tokenValue } })}
                  className="h-8 rounded-md border border-input px-3 text-xs font-medium hover:bg-accent disabled:opacity-50"
                >
                  {revokeSession.isPending ? 'revoking...' : 'revoke'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border">
        <div className="border-b px-4 py-3 text-sm font-medium">accounts and permissions</div>

        <form className="grid gap-3 border-b px-4 py-4 md:grid-cols-5" onSubmit={handleCreateUser}>
          <input
            name="email"
            type="email"
            placeholder="email"
            required
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          />
          <input
            name="username"
            placeholder="username"
            minLength={3}
            required
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          />
          <input
            name="password"
            type="password"
            placeholder="password"
            minLength={8}
            required
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          />
          <select
            name="role"
            defaultValue="operator"
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            {roles.map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={createUser.isPending}
            className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createUser.isPending ? 'creating...' : 'create account'}
          </button>
        </form>

        {submissionError && (
          <p className="px-4 py-2 text-sm text-destructive" role="alert">
            {submissionError}
          </p>
        )}

        {allUsers.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            no accounts exist yet. use the form above to create one.
          </p>
        ) : (
          <div className="divide-y">
            {allUsers.map(account => (
              <div key={account.id} className="flex items-center justify-between px-4 py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{account.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {account.email} ·{' '}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_CLS[account.role] ?? ''}`}
                    >
                      {account.role}
                    </span>{' '}
                    · created {new Date(account.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={account.role}
                    onChange={e => {
                      if (isRole(e.target.value)) {
                        updateRole.mutate({ args: { userId: account.id, role: e.target.value } })
                      }
                    }}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                  >
                    {roles.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  {confirmDeleteId === account.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          deleteUser.mutate(
                            { args: { userId: account.id } },
                            { onSuccess: () => setConfirmDeleteId(null) },
                          )
                        }}
                        disabled={deleteUser.isPending}
                        className="h-8 rounded-md bg-destructive px-3 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                      >
                        confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="h-8 rounded-md border border-input px-3 text-xs font-medium hover:bg-accent"
                      >
                        cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(account.id)}
                      className="h-8 rounded-md bg-destructive px-3 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
                    >
                      delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
