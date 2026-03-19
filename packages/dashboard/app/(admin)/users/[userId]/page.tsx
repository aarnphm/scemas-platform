export default function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">user detail</h1>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">user detail + role edit (phase 6)</p>
      </div>
    </div>
  )
}
