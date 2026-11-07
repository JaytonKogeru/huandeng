import type { IncomingMessage, ServerResponse } from 'node:http';

export class BodyTooLargeError extends Error {
  constructor() {
    super('request body too large');
    this.name = 'BodyTooLargeError';
  }
}

export async function readBody(
  req: IncomingMessage,
  limit = Number.POSITIVE_INFINITY,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        req.destroy();
        reject(new BodyTooLargeError());
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}
