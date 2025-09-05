import { Redis } from '@upstash/redis';

try {
  const client = new Redis({ url: 'https://example.com', token: 'x' });
  console.log('client created');
  console.log('lrange:', typeof client.lrange);
  console.log('lpush:', typeof client.lpush);
  console.log('ltrim:', typeof client.ltrim);
  process.exit(0);
} catch (err) {
  console.error('error creating client', err);
  process.exit(2);
}
