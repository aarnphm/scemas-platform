import type { PageSizeOption } from '@/lib/settings'
import { PAGE_SIZE_OPTIONS, useSettings } from '@/lib/settings'
import { useAuthStore } from '@/store/auth'

export function SettingsPage() {
  const user = useAuthStore(s => s.user)

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-semibold text-balance">settings</h1>

      <section className="rounded-lg border p-4 space-y-4">
        <h2 className="text-xs font-medium text-muted-foreground">profile</h2>
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">email</p>
            <p className="mt-0.5">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">username</p>
            <p className="mt-0.5">{user?.username}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">role</p>
            <p className="mt-0.5">
              <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium">
                {user?.role}
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <div>
          <h2 className="text-xs font-medium text-muted-foreground">items per page</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground/50 text-pretty">
            applies to all paginated lists across the app.
          </p>
        </div>
        <PageSizeSelector />
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-xs font-medium text-muted-foreground">desktop</h2>
        <DesktopPreferences />
      </section>
    </div>
  )
}

function PageSizeSelector() {
  const pageSize = useSettings(s => s.pageSize)
  const setPageSize = useSettings(s => s.setPageSize)

  return (
    <div className="inline-flex items-center rounded-md border border-input">
      {PAGE_SIZE_OPTIONS.map(size => (
        <button
          key={size}
          onClick={() => setPageSize(size as PageSizeOption)}
          className={`h-7 min-w-[40px] px-3 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
            pageSize === size
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {size}
        </button>
      ))}
    </div>
  )
}

function DesktopPreferences() {
  const notifications = useSettings(s => s.notifications)
  const setNotifications = useSettings(s => s.setNotifications)
  const minimizeToTray = useSettings(s => s.minimizeToTray)
  const setMinimizeToTray = useSettings(s => s.setMinimizeToTray)

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={notifications}
          onChange={e => setNotifications(e.target.checked)}
          className="size-4 rounded border-input"
        />
        desktop notifications for alerts
      </label>
      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={minimizeToTray}
          onChange={e => setMinimizeToTray(e.target.checked)}
          className="size-4 rounded border-input"
        />
        minimize to system tray on close
      </label>
    </div>
  )
}
