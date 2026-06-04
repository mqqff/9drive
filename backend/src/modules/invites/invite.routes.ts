import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/prisma.js'
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware.js'

export const inviteRouter = Router()
inviteRouter.use(requireAuth)

const inviteSchema = z.object({ email: z.string().email(), role: z.enum(['viewer', 'editor']).default('viewer') })

function serializeInvite(invite: { id: string; inviteeEmail: string; role: string; status: string; revokedAt: Date | null; acceptedAt: Date | null; createdAt: Date; updatedAt: Date }, user?: { id: string; name: string; email: string } | null) {
  return {
    id: invite.id,
    email: invite.inviteeEmail,
    role: invite.role,
    status: invite.status,
    revokedAt: invite.revokedAt?.toISOString() ?? null,
    acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    createdAt: invite.createdAt.toISOString(),
    updatedAt: invite.updatedAt.toISOString(),
    user: user ?? null,
  }
}

inviteRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const invites = await prisma.workspaceInvite.findMany({ where: { inviterId: req.user!.id, revokedAt: null }, orderBy: { createdAt: 'desc' } })
    const users = await prisma.user.findMany({ where: { email: { in: invites.map((invite) => invite.inviteeEmail) } }, select: { id: true, name: true, email: true } })
    const userByEmail = new Map(users.map((user) => [user.email, user]))
    const acceptedInvites = invites.filter((invite) => invite.status === 'pending' && userByEmail.has(invite.inviteeEmail))

    if (acceptedInvites.length > 0) {
      await prisma.workspaceInvite.updateMany({ where: { id: { in: acceptedInvites.map((invite) => invite.id) } }, data: { status: 'accepted', acceptedAt: new Date() } })
    }

    return res.json({
      invites: invites.map((invite) => serializeInvite({ ...invite, status: userByEmail.has(invite.inviteeEmail) ? 'accepted' : invite.status, acceptedAt: userByEmail.has(invite.inviteeEmail) ? invite.acceptedAt ?? new Date() : invite.acceptedAt }, userByEmail.get(invite.inviteeEmail))),
    })
  } catch (error) {
    return next(error)
  }
})

inviteRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const body = inviteSchema.parse(req.body)
    const email = body.email.trim().toLowerCase()
    const inviter = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: { email: true } })
    if (email === inviter.email) return res.status(400).json({ code: 'INVITE_SELF_NOT_ALLOWED', message: 'You cannot invite yourself.' })
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } })
    const invite = await prisma.workspaceInvite.upsert({
      where: { inviterId_inviteeEmail: { inviterId: req.user!.id, inviteeEmail: email } },
      create: { inviterId: req.user!.id, inviteeEmail: email, role: body.role, status: existingUser ? 'accepted' : 'pending', acceptedAt: existingUser ? new Date() : null },
      update: { role: body.role, status: existingUser ? 'accepted' : 'pending', acceptedAt: existingUser ? new Date() : null, revokedAt: null },
    })
    return res.status(201).json({ invite: serializeInvite(invite, existingUser) })
  } catch (error) {
    return next(error)
  }
})

inviteRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const result = await prisma.workspaceInvite.updateMany({ where: { id: String(req.params.id), inviterId: req.user!.id, revokedAt: null }, data: { status: 'revoked', revokedAt: new Date() } })
    if (result.count === 0) return res.status(404).json({ code: 'INVITE_NOT_FOUND', message: 'Invite not found.' })
    return res.json({ status: 'ok' })
  } catch (error) {
    return next(error)
  }
})
