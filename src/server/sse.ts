import { Response } from 'express';

const clients = new Set<Response>();

export function addSseClient(res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
  clients.add(res);

  res.on('close', () => {
    clients.delete(res);
  });
}

export function broadcastEvent(eventType: string, payload: Record<string, unknown> = {}): void {
  const message = `data: ${JSON.stringify({ type: eventType, payload, timestamp: Date.now() })}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch {
      clients.delete(client);
    }
  }
}
