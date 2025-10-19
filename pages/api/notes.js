import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { notes } = req.body;
  if (!notes || !notes.trim()) return res.status(400).json({ error: "Notes required" });

  try {
    const truncated = notes.slice(0, 3000); // keep token limits in mind

    // 1️⃣ Generate summary
    const summaryResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Summarize clearly:\n\n${truncated}` }],
    });
    const summary = summaryResp.choices[0].message.content;

    // 2️⃣ Generate flashcards, forcing valid JSON output
    const flashcardsResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Create 3-5 flashcards from the following text. Respond **ONLY** with valid JSON array: [{"question": "...","answer": "..."}]. Do not include any other text.\n\nText:\n${truncated}`,
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

    // Always ensure flipped property for frontend
    flashcards = flashcards.map((f) => ({ ...f, flipped: false }));

    res.status(200).json({ summaries: [summary], flashcards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate. " + err.message });
  }
}
