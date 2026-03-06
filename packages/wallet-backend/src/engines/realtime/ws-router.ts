import { FastifyInstance } from 'fastify';
import { getNatsConnection } from '../../nats/client.js';
import { logger } from '../../logger.js';

/**
 * WebSocket router for real-time document updates.
 * Bridges NATS subjects to connected WebSocket clients.
 *
 * Note: Requires @fastify/websocket plugin to be registered on the Fastify instance.
 * Currently registers the route handler; actual WS upgrade requires the plugin.
 */
export async function wsRouter(fastify: FastifyInstance): Promise<void> {
  // Health check for WS endpoint
  fastify.get('/ws/health', async (_request, reply) => {
    const natsConnected = getNatsConnection() !== null;
    return reply.send({ status: 'ok', nats: natsConnected });
  });

  /**
   * WS endpoint: /ws/documents
   * Query params: workspace, superAppId, portal
   *
   * When NATS is connected, subscribe caller to relevant subjects and forward
   * new document events as JSON messages over the WebSocket.
   */
  fastify.get('/ws/documents', async (request, reply) => {
    const params = request.query as {
      workspace?: string;
      superAppId?: string;
      portal?: string;
    };

    if (!params.workspace || !params.superAppId) {
      return reply.status(400).send({ error: 'workspace and superAppId query params required' });
    }

    // WebSocket upgrade happens at a higher level (plugin);
    // return a descriptor of what subject to subscribe to.
    const subject = `param.syncfactory.${params.workspace}.${params.superAppId}.create`;
    logger.info({ subject }, 'WS document subscription requested');

    return reply.send({
      message: 'WebSocket upgrade required',
      subject,
      note: 'Register @fastify/websocket and upgrade this connection',
    });
  });
}
