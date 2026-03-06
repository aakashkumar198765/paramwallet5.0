import { FastifyInstance } from 'fastify';
import { getDb } from '../../db/mongo.js';
import { resolveSuperAppDbName } from '../../db/resolver.js';
import type { AuthContext } from '../../middleware/auth.js';
import type { RequestContext } from '../../middleware/request-context.js';
import { FastifyRequest, FastifyReply } from 'fastify';

interface Notification {
  _id: string;
  userId: string;
  superAppId: string;
  type: string;
  title: string;
  message: string;
  docId?: string;
  read: boolean;
  createdAt: Date;
}

export async function notificationRouter(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /notifications
   * Returns unread notifications for the authenticated user in the current SuperApp context.
   */
  fastify.get('/notifications', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as FastifyRequest & {
      authContext: AuthContext;
      requestContext: RequestContext;
    };
    const { superAppDbName, superAppId } = req.requestContext;

    if (!superAppDbName || !superAppId) {
      return reply.status(400).send({ error: 'X-Workspace and X-SuperApp-ID headers required' });
    }

    const sappDb = getDb(superAppDbName);
    const notifications = await sappDb
      .collection<Notification>('notifications')
      .find({ userId: req.authContext.userId, read: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return reply.send({ data: notifications });
  });

  /**
   * PUT /notifications/:notificationId/read
   * Mark a notification as read.
   */
  fastify.put(
    '/notifications/:notificationId/read',
    async (
      request: FastifyRequest<{ Params: { notificationId: string } }>,
      reply: FastifyReply
    ) => {
      const req = request as FastifyRequest<{ Params: { notificationId: string } }> & {
        authContext: AuthContext;
        requestContext: RequestContext;
      };
      const { superAppDbName } = req.requestContext;

      if (!superAppDbName) {
        return reply.status(400).send({ error: 'X-Workspace and X-SuperApp-ID headers required' });
      }

      const sappDb = getDb(superAppDbName);
      const result = await sappDb.collection<Notification>('notifications').findOneAndUpdate(
        {
          _id: request.params.notificationId as unknown as string,
          userId: req.authContext.userId,
        },
        { $set: { read: true, readAt: new Date() } },
        { returnDocument: 'after' }
      );

      if (!result) return reply.status(404).send({ error: 'Notification not found' });
      return reply.send({ data: result });
    }
  );

  /**
   * PUT /notifications/read-all
   * Mark all notifications as read for the authenticated user.
   */
  fastify.put('/notifications/read-all', async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as FastifyRequest & {
      authContext: AuthContext;
      requestContext: RequestContext;
    };
    const { superAppDbName } = req.requestContext;

    if (!superAppDbName) {
      return reply.status(400).send({ error: 'X-Workspace and X-SuperApp-ID headers required' });
    }

    const sappDb = getDb(superAppDbName);
    const result = await sappDb.collection<Notification>('notifications').updateMany(
      { userId: req.authContext.userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return reply.send({ success: true, modified: result.modifiedCount });
  });
}
