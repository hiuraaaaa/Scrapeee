import axios from "axios";

// chunk HTML per 1500 karakter
function chunkHTML(html, chunkSize = 1500) {
  const chunks = [];
  let start = 0;
  while (start < html.length) {
    chunks.push(html.slice(start, start + chunkSize));
    start += chunkSize;
  }
  return chunks;
}

// Daftar AI endpoints (fallback)
const AIs = [
  { name: "NekoLabs 5-mini", url: "https://api.nekolabs.web.id/text.gen/gpt/5-mini", sessionId: "neko1" },
  { name: "NekoLabs 4.1-nano", url: "https://api.nekolabs.web.id/text.gen/gpt/4.1-nano", sessionId: "neko2" }
];

// panggil AI dengan fallback
async function callAIWithFallback(prompt) {
  for (const ai of AIs) {
    try {
      const res = await axios.post(ai.url, {
        text: prompt,
        systemPrompt: "Kamu adalah asisten yang membuat JSON scrape-ready dari HTML, termasuk title, text, images, links, htmlSelectors, CSS, dan JS.",
        sessionId: ai.sessionId
      }, { timeout: 60000 });

      if (res.data?.success) return { result: res.data.result, ai: ai.name };

      if (res.data?.result?.includes("You have reached your AI usage limit")) continue;

      return { result: `❌ AI Error: ${res.data?.result || "Unknown"}`, ai: ai.name };
    } catch(err) { continue; }
  }
  return { result: "❌ Semua AI gagal untuk chunk ini", ai: null };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { html } = req.body;
  if (!html) return res.status(400).json({ error: "HTML content required" });

  const chunks = chunkHTML(html, 1500);
  const allResults = [];

  try {
    for (let i = 0; i < chunks.length; i++) {
      const prompt = `
Buat JSON scrape-ready dari HTML berikut (chunk ${i+1}/${chunks.length}). Struktur JSON wajib:
{
  "title": "...",
  "text": "...",
  "images": ["..."],
  "links": ["..."],
  "htmlSelectors": { "header": "...", "paragraphs": "...", "sections": "...", "images": "...", "links": "..." },
  "css": { ... },
  "js": { ... }
}

HTML:
${chunks[i]}
`;
      const { result, ai } = await callAIWithFallback(prompt);
      allResults.push({ chunk: i+1, aiUsed: ai, result });
      console.log(`Chunk ${i+1}/${chunks.length} done (AI: ${ai || "none"})`);
    }

    // gabungkan semua hasil chunk menjadi array JSON
    const finalJSON = allResults.map(c => {
      try { return JSON.parse(c.result); } 
      catch { return { chunk: c.chunk, aiUsed: c.aiUsed, raw: c.result }; }
    });

    res.status(200).json({
      success: true,
      totalChunks: chunks.length,
      summary: finalJSON,
      details: allResults
    });

  } catch(err) {
    res.status(500).json({ error: "AI analysis failed", details: err.message });
  }
}
