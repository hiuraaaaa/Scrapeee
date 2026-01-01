import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    const response = await axios.get(url);
    res.status(200).json({ html: response.data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch URL", details: err.message });
  }
}
