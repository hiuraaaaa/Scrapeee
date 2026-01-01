import axios from "axios";

// helper: chunk HTML per 1500 karakter
function chunkHTML(html, chunkSize = 1500) {
  const chunks = [];
  let start = 0;
  while (start < html.length) {
    chunks.push(html.slice(start, start + chunkSize));
    start += chunkSize;
  }
  return chunks;
}

// Helper: call NekoLabs GPT API
async function callNekoLabs(prompt, sessionId) {
  try {
    const response = await axios.post(
      "https://api.nekolabs.web.id/text.gen/gpt/5",
      {
        text: prompt,
        systemPrompt: "Kamu adalah asisten yang merangkum website untuk scraping",
        sessionId
      },
      { timeout: 60000 } // 60 detik timeout
    );

    if (response.data?.success) return response.data.result;

    // jika limit akun
    if (response.data?.result?.includes("You have reached your AI usage limit")) {
      return "❌ AI limit reached for this chunk";
    }

    return `❌ AI Error: ${response.data?.result || "Unknown"}`;
  } catch (err) {
    // tangani timeout atau network error
    return `❌ Request failed: ${err.message}`;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { html, sessionId = "12345" } = req.body;
  if (!html) return res.status(400).json({ error: "HTML content required" });

  const chunks = chunkHTML(html, 1500);
  let allSummaries = [];

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

      const result = await callNekoLabs(prompt, sessionId);
      allSummaries.push(result);

      // optional: log ke console untuk debug / frontend SSE
      console.log(`Chunk ${i + 1}/${chunks.length} done:`, result.slice(0, 60), "...");
    }

    const finalSummary = allSummaries.join("\n\n");
    res.status(200).json({ summary: finalSummary, chunks: allSummaries.length });

  } catch (err) {
    res.status(500).json({ error: "AI analysis failed", details: err.message });
  }
}
