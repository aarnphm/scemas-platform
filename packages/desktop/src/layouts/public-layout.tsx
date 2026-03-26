import { Outlet, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth'

export function PublicLayout() {
  const user = useAuthStore(s => s.user)
  const clearSession = useAuthStore(s => s.clearSession)
  const navigate = useNavigate()

  const handleSignOut = () => {
    clearSession()
    navigate({ to: '/sign-in' })
  }

  return (
    <div className="flex h-dvh flex-col">
      <div
        data-tauri-drag-region
        className="flex h-8 shrink-0 items-center justify-between border-b pl-[76px] pr-4"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div
          className="flex items-center gap-2"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <span className="text-sm font-semibold">SCEMAS</span>
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            PublicUser
          </span>
        </div>
        <div
          className="flex items-center gap-4 text-xs"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <span className="text-muted-foreground">{user?.email}</span>
          <button onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
            sign out
          </button>
        </div>
      </div>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
