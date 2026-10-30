// Vercel serverless function: proxies Orbit's "generate a pick" prompt to a free
// LLM so the API key never reaches the browser. Groq first, Gemini as fallback.

function setCors(res) {
  var origin = process.env.ALLOWED_ORIGIN || '';
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function extractJson(text) {
  if (!text) return null;
  var match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch (e) { return null; }
}

async function callGroq(prompt) {
  var key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('groq_not_configured');
  var resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 300
    })
  });
  if (!resp.ok) { var e = new Error('groq_http_' + resp.status); e.status = resp.status; throw e; }
  var data = await resp.json();
  var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  var parsed = extractJson(text);
  if (!parsed || !parsed.title) throw new Error('groq_bad_shape');
  return parsed;
}

async function callGemini(prompt) {
  var key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('gemini_not_configured');
  var resp = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );
  if (!resp.ok) { var e = new Error('gemini_http_' + resp.status); e.status = resp.status; throw e; }
  var data = await resp.json();
  var text = data.candidates && data.candidates[0] && data.candidates[0].content &&
    data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
    data.candidates[0].content.parts[0].text;
  var parsed = extractJson(text);
  if (!parsed || !parsed.title) throw new Error('gemini_bad_shape');
  return parsed;
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  var prompt = req.body && req.body.prompt;
  if (!prompt || typeof prompt !== 'string') { res.status(400).json({ error: 'missing_prompt' }); return; }

  try {
    var item = await callGroq(prompt);
    res.status(200).json(item);
  } catch (groqErr) {
    try {
      var item2 = await callGemini(prompt);
      res.status(200).json(item2);
    } catch (geminiErr) {
      var rateLimited = groqErr.status === 429 || geminiErr.status === 429;
      res.status(rateLimited ? 429 : 502).json({ error: rateLimited ? 'rate_limited' : 'generation_failed' });
    }
  }
};
