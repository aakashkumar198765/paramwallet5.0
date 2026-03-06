const http = require('http');

// Map unsupported models to allowed Vertex AI models
const MODEL_MAP = {
  'claude-sonnet-4-6': 'vertex_ai/claude-sonnet-4-5@20250929',
  'claude-haiku-4-6': 'vertex_ai/claude-haiku-4-5@20251001',
  'claude-opus-4-6': 'vertex_ai/claude-sonnet-4-5@20250929', // fallback to sonnet
};

function deepStrip(obj) {
  if (Array.isArray(obj)) {
    return obj.map(deepStrip);
  } else if (obj && typeof obj === 'object') {
    const clean = {};
    for (const key of Object.keys(obj)) {
      if (key === 'cache_control') continue; // strip cache_control everywhere
      clean[key] = deepStrip(obj[key]);
    }
    return clean;
  }
  return obj;
}

http.createServer((req, res) => {
  // Strip all beta headers
  delete req.headers['anthropic-beta'];

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body);

      // Strip unsupported top-level fields
      delete parsed.context_management;

      // Rewrite unsupported models to allowed Vertex AI models
      if (parsed.model && MODEL_MAP[parsed.model]) {
        parsed.model = MODEL_MAP[parsed.model];
      }

      // Vertex AI (Claude 4.5) only accepts thinking.type: 'disabled' or 'enabled'.
      // Claude Code sends 'adaptive' (4.6-only); rewrite to 'disabled'.
      if (parsed.thinking?.type === 'adaptive') {
        parsed.thinking = { type: 'disabled' };
      }

      // Deep strip all cache_control from entire body
      const cleaned = deepStrip(parsed);

      body = JSON.stringify(cleaned);
    } catch (e) {}

    const options = {
      hostname: '34.100.207.212',
      port: 4001,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        'content-length': Buffer.byteLength(body)
      }
    };

    const proxy = http.request(options, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });

    proxy.write(body);
    proxy.end();
  });
}).listen(8001, () => console.log('Proxy running on http://localhost:8001'));