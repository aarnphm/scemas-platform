'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { trpc } from '@/lib/trpc'

const roles = ['operator', 'admin', 'viewer'] as const

export function UsersManager() {
  const utils = trpc.useUtils()
  const usersQuery = trpc.users.list.useQuery()
  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.users.list.invalidate(),
        utils.audit.list.invalidate(),
      ])
    },
  })

  if (usersQuery.isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Spinner />
          loading users
        </span>
      </div>
    )
  }

  if (usersQuery.isError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-card p-4 text-sm text-destructive">
        {usersQuery.error.message}
      </div>
    )
  }

  const users = usersQuery.data ?? []

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3 text-sm font-medium">
        accounts and permissions
      </div>
      {users.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          no accounts exist yet
        </p>
      ) : (
        <div className="divide-y divide-border">
          {users.map(account => (
            <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between" key={account.id}>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  <Link className="underline-offset-4 hover:underline" href={`/users/${account.id}`}>
                    {account.username}
                  </Link>
                </p>
                <p className="text-xs text-muted-foreground">
                  {account.email} | created {account.createdAt.toLocaleString()}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {roles.map(role => (
                  <Button
                    disabled={updateRole.isPending}
                    key={role}
                    onClick={() => updateRole.mutate({ userId: account.id, role })}
                    size="sm"
                    type="button"
                    variant={account.role === role ? 'default' : 'outline'}
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
