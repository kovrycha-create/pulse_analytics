import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
// Avoid runtime import of TypeScript-only modules in serverless environment.
type PageView = any;

// Fix: Use the /tmp directory for storage, as it's the only writable location in a Vercel serverless environment.
// This also resolves the TypeScript error 'Property 'cwd' does not exist on type 'Process''.
const DB_PATH = path.join('/tmp', 'data', 'db.json');

const ensureDirectoryExists = async () => {
  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  } catch (error) {
    console.error("Error ensuring directory exists:", error);
    throw new Error("Could not create data directory.");
  }
};

const readDatabase = async (): Promise<PageView[]> => {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []; // File doesn't exist, return empty array
    }
    console.error("Error reading database:", error);
    throw new Error("Could not read from database.");
  }
};

const writeDatabase = async (data: PageView[]): Promise<void> => {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error writing to database:", error);
    throw new Error("Could not write to database.");
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS: echo back the request Origin and allow credentials.
  // Browsers will reject Access-Control-Allow-Origin: '*' when credentials are included.
  const requestOrigin = (req.headers.origin as string) || '';
  const allowOrigin = requestOrigin || '*';
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // allow credentials (cookies) if the request includes them
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    // 204 No Content is appropriate for preflight
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const payload = req.body || {};

    // basic validation
    if (!payload.page || !payload.userAgent || !payload.timestamp) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // get remote IP (best-effort)
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') as string;

    // session id: hash of ip + ua, but include time proximity handling on read-side
    const sessionBase = `${ip}|${payload.userAgent}`;
    const sessionId = crypto.createHash('sha1').update(sessionBase).digest('hex');

  const newView: PageView = {
      id: crypto.randomUUID(),
      page: payload.page,
      referrer: payload.referrer || '',
      userAgent: payload.userAgent,
      timestamp: payload.timestamp,
      type: payload.type,
      screen: payload.screen,
      viewport: payload.viewport,
      deviceType: payload.deviceType,
      performance: payload.performance,
      timeOnPage: payload.timeOnPage,
      scrollDepth: payload.scrollDepth,
      eventName: payload.eventName,
      properties: payload.properties,
      sessionId
    };

  // Log incoming event for debugging in server logs
  console.log('Track incoming origin=', req.headers.origin || '', 'page=', newView.page, 'type=', newView.type);

  await ensureDirectoryExists();
  const db = await readDatabase();
  db.push(newView);
  await writeDatabase(db);

  // Log resulting DB size to help detect ephemeral storage issues
  console.log('Track wrote DB entries=', Array.isArray(db) ? db.length : 'unknown');

  return res.status(201).json({ message: 'Tracked successfully' });

  } catch (error) {
    console.error('Tracking Error:', error);
    let message = 'Internal Server Error';
    if (error instanceof Error) {
      message = error.message;
    }
    return res.status(500).json({ message });
  }
}