import { UsersManager } from '@/components/admin/users-manager'

// ManageSecurityPermissions boundary (AccessManager, admin-only)
export default function UsersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">user management</h1>
      <p className="text-sm text-muted-foreground">
        manage which dashboard each account can reach and which control surfaces they can touch
      </p>
      <UsersManager />
    </div>
  )
}
