import { useEffect, useState } from 'react'
import { Clock, Trash2, Users, UserCheck } from 'lucide-react'
import { FileTable } from '@/components/drive/FileTable'
import { FolderGrid } from '@/components/drive/FolderGrid'
import { MetricCard } from '@/components/drive/MetricCard'
import { PageHeader } from '@/components/drive/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { sharedFiles, sharedFolders } from '@/data/drive-data'
import { apiFetch, formatDate } from '@/lib/api'
import { cn } from '@/lib/utils'

type Invite = {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
  acceptedAt: string | null
  user: { id: string; name: string; email: string } | null
}

export function SharedPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [message, setMessage] = useState('')
  const pendingCount = invites.filter((invite) => invite.status === 'pending').length
  const acceptedCount = invites.filter((invite) => invite.status === 'accepted').length

  async function loadInvites() {
    const data = await apiFetch<{ invites: Invite[] }>('/invites')
    setInvites(data.invites)
  }

  useEffect(() => {
    loadInvites().catch((error) => setMessage(error instanceof Error ? error.message : 'Failed to load shared members'))
    window.addEventListener('9drive:invites-changed', loadInvites)
    return () => window.removeEventListener('9drive:invites-changed', loadInvites)
  }, [])

  async function revokeInvite(id: string) {
    await apiFetch(`/invites/${id}`, { method: 'DELETE' })
    await loadInvites()
  }

  return (
    <>
      <PageHeader title="Shared With Me" description="Files, folders, and invited members in your workspace." />
      {message ? <p className="mt-5 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">{message}</p> : null}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <MetricCard label="Shared Items" value={String(sharedFiles.length + sharedFolders.length)} icon={Users} />
        <MetricCard label="Team Members" value={String(invites.length)} icon={UserCheck} />
        <MetricCard label="Pending Invites" value={String(pendingCount)} icon={Clock} />
      </div>

      <Card className="mt-8 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold">Workspace Members</h2>
            <p className="mt-1 text-sm text-slate-500">Accepted: {acceptedCount}. Pending: {pendingCount}.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {invites.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No members invited yet. Use Invite Members from the top bar.</p> : invites.map((invite) => (
            <div key={invite.id} className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-all font-semibold text-slate-950">{invite.user?.name ?? invite.email}</p>
                <p className="break-all text-sm text-slate-500">{invite.email}</p>
                <p className="mt-1 text-xs text-slate-500">Invited {formatDate(invite.createdAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold capitalize text-slate-600">{invite.role}</span>
                <span className={cn('rounded-full px-3 py-1 text-xs font-bold capitalize', invite.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{invite.status}</span>
                <Button variant="danger" size="sm" onClick={() => revokeInvite(invite.id)}><Trash2 className="h-4 w-4" />Revoke</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <FolderGrid items={sharedFolders} />
      <FileTable files={sharedFiles} mode="shared" />
    </>
  )
}
