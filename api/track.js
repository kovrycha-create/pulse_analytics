import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.join('/tmp', 'data', 'db.json');

const ensureDirectoryExists = async () => {
  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  } catch (error) {
    console.error('Error ensuring directory exists:', error);
    throw new Error('Could not create data directory.');
  }
};

const readDatabase = async () => {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    console.error('Error reading database:', error);
    throw new Error('Could not read from database.');
  }
};

const writeDatabase = async (data) => {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to database:', error);
    throw new Error('Could not write to database.');
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const payload = req.body || JSON.parse(await getRawBody(req) );

    if (!payload.page || !payload.userAgent || !payload.timestamp) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const ip = (req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '');
    const sessionBase = `${ip}|${payload.userAgent}`;
    const sessionId = crypto.createHash('sha1').update(sessionBase).digest('hex');

    const newView = {
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

    await ensureDirectoryExists();
    const db = await readDatabase();
    db.push(newView);
    await writeDatabase(db);

    return res.status(201).json({ message: 'Tracked successfully' });
  } catch (error) {
    console.error('Tracking Error:', error);
    let message = 'Internal Server Error';
    if (error && error.message) message = error.message;
    return res.status(500).json({ message });
  }
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on && req.on('data', chunk => data += chunk.toString());
    req.on && req.on('end', () => resolve(data));
    req.on && req.on('error', reject);
  });
}
