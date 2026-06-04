import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/prisma.js'
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware.js'

export const folderRouter = Router()
folderRouter.use(requireAuth)

const createSchema = z.object({
  name: z.string().min(1).max(255),
  color: z.string().min(1).max(64).optional(),
})

function serializeFolder(folder: { id: string; name: string; color: string; createdAt: Date; updatedAt: Date }) {
  return { ...folder, createdAt: folder.createdAt.toISOString(), updatedAt: folder.updatedAt.toISOString() }
}

folderRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.user!.id, deletedAt: null },
      select: { id: true, name: true, color: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })
    return res.json({ folders: folders.map(serializeFolder) })
  } catch (error) {
    return next(error)
  }
})

folderRouter.get('/recent', async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 4), 4)
    const folders = await prisma.folder.findMany({
      where: { userId: req.user!.id, deletedAt: null },
      select: { id: true, name: true, color: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
    return res.json({ folders: folders.map(serializeFolder) })
  } catch (error) {
    return next(error)
  }
})

folderRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const body = createSchema.parse(req.body)
    const folder = await prisma.folder.create({
      data: { userId: req.user!.id, name: body.name, color: body.color ?? 'text-blue-500' },
      select: { id: true, name: true, color: true, createdAt: true, updatedAt: true },
    })
    return res.status(201).json({ folder: serializeFolder(folder) })
  } catch (error) {
    return next(error)
  }
})

folderRouter.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const body = createSchema.partial().parse(req.body)
    const folder = await prisma.folder.updateMany({
      where: { id: String(req.params.id), userId: req.user!.id, deletedAt: null },
      data: { ...(body.name ? { name: body.name } : {}), ...(body.color ? { color: body.color } : {}) },
    })
    if (folder.count === 0) return res.status(404).json({ code: 'FOLDER_NOT_FOUND', message: 'Folder not found.' })
    const updated = await prisma.folder.findFirstOrThrow({
      where: { id: String(req.params.id), userId: req.user!.id },
      select: { id: true, name: true, color: true, createdAt: true, updatedAt: true },
    })
    return res.json({ folder: serializeFolder(updated) })
  } catch (error) {
    return next(error)
  }
})

folderRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    await prisma.folder.updateMany({ where: { id: String(req.params.id), userId: req.user!.id }, data: { deletedAt: new Date() } })
    return res.json({ status: 'ok' })
  } catch (error) {
    return next(error)
  }
})
