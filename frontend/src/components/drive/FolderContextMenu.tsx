import { Edit3, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FolderItem } from '@/data/drive-data'

export function FolderContextMenu({ x, y, folder, onClose, onRename, onDelete }: { x: number; y: number; folder: FolderItem | null; onClose: () => void; onRename: () => void; onDelete: () => void }) {
  if (!folder) return null

  return (
    <>
      <button className="fixed inset-0 z-40 cursor-default" aria-label="Close folder menu" onClick={onClose} />
      <div className="fixed z-50 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15" style={{ left: x, top: y }}>
        <p className="truncate px-3 py-2 text-xs font-bold text-slate-500">{folder.name}</p>
        <Button variant="ghost" className="w-full justify-start" onClick={onRename}><Edit3 className="h-4 w-4" />Rename</Button>
        <Button variant="danger" className="w-full justify-start" onClick={onDelete}><Trash2 className="h-4 w-4" />Delete</Button>
      </div>
    </>
  )
}
