import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'fs';
import path from 'path';
import { PageView } from '../types';

// Fix: Use the /tmp directory for storage to be consistent with api/track.ts.
// This also resolves the TypeScript error 'Property 'cwd' does not exist on type 'Process''.
const DB_PATH = path.join('/tmp', 'data', 'db.json');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const pageViews: PageView[] = JSON.parse(data);
    return res.status(200).json(pageViews);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // If the file doesn't exist, it means no data has been tracked yet.
      return res.status(200).json([]);
    }
    console.error('Error reading stats:', error);
    return res.status(500).json({ message: 'Failed to retrieve stats' });
  }
}