export default function RuleDetailPage({ params }: { params: Promise<{ ruleId: string }> }) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">edit rule</h1>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">rule edit form (phase 6)</p>
      </div>
    </div>
  )
}
