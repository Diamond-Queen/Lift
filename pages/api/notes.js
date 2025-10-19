import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Only POST allowed" });

  const { notes } = req.body;
  if (!notes || !notes.trim()) return res.status(400).json({ error: "Notes required" });

  try {
    // Summary
    const summaryResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Summarize this text:\n\n${notes}` }],
    });

    // Flashcards
    const flashcardsResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Create 3-5 flashcards from this text. Respond only as JSON array [{"question":"...","answer":"..."}]:\n\n${notes}`,
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

    res.status(200).json({
      summaries: [summaryResp.choices[0].message.content],
      flashcards,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
