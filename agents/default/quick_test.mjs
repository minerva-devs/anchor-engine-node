// Quick test for ingestion API
import { createServer } from 'http';

const server = createServer((req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    console.log('Request body:', body);
    try {
      const json = JSON.parse(body);
      console.log('Parsed JSON:', json);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: json }));
    } catch (e) {
      console.error('JSON parse error:', e.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(3161, () => {
  console.log('Test server listening on port 3161');
});

// Now test it
import { setTimeout } from 'timers/promises';
await setTimeout(1000);

const data = { content: 'Test content for ingestion' };
console.log('Sending:', JSON.stringify(data));

const response = await fetch('http://localhost:3161/v1/ingest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

console.log('Response:', await response.text());

server.close();
