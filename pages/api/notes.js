// pages/api/notes.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { notes } = req.body; // now req.body is parsed JSON
  if (!notes || !notes.trim()) return res.status(400).json({ error: "Notes required" });

  try {
    const truncatedBlock = notes.slice(0, 2000);

    // === Summary ===
    const summaryResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: `Summarize clearly:\n\n${truncatedBlock}` },
      ],
    });
    const summary = summaryResp.choices[0].message.content;

    // === Flashcards ===
    const flashcardsResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Create 3-5 flashcards in JSON [{"question":"...","answer":"..."}] from this text:\n\n${truncatedBlock}`,
        },
      ],
    });

    let flashcards = [];
    try {
      flashcards = JSON.parse(flashcardsResp.choices[0].message.content);
      if (!Array.isArray(flashcards)) flashcards = [];
    } catch {
      flashcards = [];
    }

    flashcards = flashcards.map((f) => ({ ...f, flipped: false }));

    res.status(200).json({ summaries: [summary], flashcards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
