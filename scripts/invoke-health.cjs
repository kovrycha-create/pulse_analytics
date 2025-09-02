const handler = require('../api/health.js');

function makeReq(method = 'GET', url = '/api/health', query = {}) {
  return { method, url, query };
}

function makeRes() {
  const headers = {};
  return {
    headers,
    setHeader(k, v) { headers[k] = v; },
    end(body) { console.log('RES END BODY:', body); },
    write(s) { process.stdout.write(s); },
    statusCode: 200
  };
}

(async () => {
  try {
    const req = makeReq('GET', '/api/health');
    const res = makeRes();
    await handler(req, res);
    console.log('invocation finished');
  } catch (err) {
    console.error('handler threw:', err);
    process.exit(1);
  }
})();
