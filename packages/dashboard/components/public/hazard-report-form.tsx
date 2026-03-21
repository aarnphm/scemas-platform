'use client'

// ReportEnvironmentalHazard boundary: public submission dialog (SRS CP-C3)

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { trpc } from '@/lib/trpc'

const categories = [
  { value: 'environmental_hazard', label: 'environmental hazard' },
  { value: 'system_misuse', label: 'system misuse' },
  { value: 'inappropriate_content', label: 'inappropriate content' },
  { value: 'other', label: 'other' },
] as const

export function HazardReportForm({ zones }: { zones: { zone: string; zoneName: string }[] }) {
  const [open, setOpen] = useState(false)
  const [zone, setZone] = useState('')
  const [category, setCategory] = useState<string>('')
  const [description, setDescription] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const submit = trpc.reports.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true)
      setTimeout(() => {
        setOpen(false)
        resetForm()
      }, 2000)
    },
    onError: err => {
      setError(err.message)
    },
  })

  function resetForm() {
    setZone('')
    setCategory('')
    setDescription('')
    setContactEmail('')
    setError(null)
    setSubmitted(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!zone || !category || description.length < 10) {
      setError('please fill in all required fields (description must be at least 10 characters)')
      return
    }

    submit.mutate({
      zone,
      category: category as 'environmental_hazard' | 'system_misuse' | 'inappropriate_content' | 'other',
      description,
      contactEmail: contactEmail.trim() || null,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        setOpen(v)
        if (!v) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          report hazard
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>report an environmental hazard</DialogTitle>
          <DialogDescription>
            submit a report about environmental hazards, system misuse, or inappropriate content.
            your report will be reviewed by an administrator.
          </DialogDescription>
        </DialogHeader>
        {submitted ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            report submitted successfully. thank you.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zone">zone</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger id="zone">
                  <SelectValue placeholder="select a zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map(z => (
                    <SelectItem key={z.zone} value={z.zone}>
                      {z.zoneName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="describe the issue (10-500 characters)"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/500
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">contact email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="for follow-up only"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={submit.isPending}>
              {submit.isPending ? 'submitting...' : 'submit report'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
