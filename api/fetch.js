import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") 
    return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body;
  if (!url) 
    return res.status(400).json({ error: "URL required" });

  try {
    console.log("Fetching URL:", url);

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      timeout: 10000, // 10 detik
      maxRedirects: 5,
    });

    res.status(200).json({ html: response.data });

  } catch (err) {
    console.error("Fetch error:", err.response?.status, err.message);
    res.status(500).json({ 
      error: "Failed to fetch URL", 
      details: err.response?.statusText || err.message 
    });
  }
}
