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

// fungsi panggil AI dengan fallback
async function callAIWithFallback(prompt) {
  for (const ai of AIs) {
    try {
      const res = await axios.post(ai.url, {
        text: prompt,
        systemPrompt: "Kamu adalah asisten yang merangkum website untuk scraping",
        sessionId: ai.sessionId
      }, { timeout: 60000 }); // 60 detik timeout

      if (res.data?.success) return { result: res.data.result, ai: ai.name };

      // detect limit
      if (res.data?.result?.includes("You have reached your AI usage limit")) {
        console.log(`Chunk skipped, ${ai.name} limit reached`);
        continue; // fallback ke AI berikutnya
      }

      // jika error lain
      return { result: `❌ AI Error: ${res.data?.result || "Unknown"}`, ai: ai.name };

    } catch (err) {
      console.log(`Chunk failed on ${ai.name}: ${err.message}`);
      continue; // fallback ke AI berikutnya
    }
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
Ringkas konten HTML berikut (chunk ${i + 1}/${chunks.length}), termasuk:
1. Konten penting yang bisa di-scrape (judul, teks, gambar, link)
2. Struktur HTML penting
3. CSS utama / style
4. JS utama / fungsi penting

HTML:
${chunks[i]}
`;

      // panggil AI dengan fallback
      const { result, ai } = await callAIWithFallback(prompt);
      allResults.push({ chunk: i + 1, aiUsed: ai, result });

      // log ke console / frontend
      console.log(`Chunk ${i + 1}/${chunks.length} done (AI: ${ai || "none"}): ${result.slice(0,60)}...`);
    }

    const finalSummary = allResults.map(c => `Chunk ${c.chunk} (AI: ${c.aiUsed || "none"}):\n${c.result}`).join("\n\n");

    res.status(200).json({
      success: true,
      totalChunks: chunks.length,
      summary: finalSummary,
      details: allResults
    });

  } catch (err) {
    res.status(500).json({ error: "AI analysis failed", details: err.message });
  }
}
