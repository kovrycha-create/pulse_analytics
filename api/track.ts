import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PageView } from '../types';

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
  // Set CORS headers for all responses from this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { page, referrer, userAgent, timestamp } = req.body;

    if (!page || !userAgent || !timestamp) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newView: PageView = {
      id: crypto.randomUUID(),
      page,
      referrer: referrer || '',
      userAgent,
      timestamp,
    };
    
    await ensureDirectoryExists();
    const db = await readDatabase();
    db.push(newView);
    await writeDatabase(db);

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