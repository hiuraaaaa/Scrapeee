import axios from "axios";

// helper: chunk HTML per 2000 karakter
function chunkHTML(html, chunkSize = 2000) {
  const chunks = [];
  let start = 0;
  while (start < html.length) {
    chunks.push(html.slice(start, start + chunkSize));
    start += chunkSize;
  }
  return chunks;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { html, sessionId = "12345" } = req.body;
  if (!html) return res.status(400).json({ error: "HTML content required" });

  const chunks = chunkHTML(html);
  let allSummaries = [];

  try {
    for (let i = 0; i < chunks.length; i++) {
      const prompt = `
Ringkas konten HTML berikut, termasuk:
1. Konten penting yang bisa di-scrape (judul, teks, gambar, link)
2. Struktur HTML penting
3. CSS utama / style
4. JS utama / fungsi penting

HTML:
${chunks[i]}
`;

      const response = await axios.post("https://api.nekolabs.web.id/text.gen/gpt/5", {
        text: prompt,
        systemPrompt: "Kamu adalah asisten yang merangkum website untuk scraping",
        sessionId
      });

      if (response.data.success) {
        allSummaries.push(response.data.result);
      } else {
        allSummaries.push("❌ Error: " + (response.data.result || "AI failed"));
      }
    }

    const finalSummary = allSummaries.join("\n\n");
    res.status(200).json({ summary: finalSummary });

  } catch (err) {
    res.status(500).json({ error: "AI analysis failed", details: err.message });
  }
}
