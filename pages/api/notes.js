import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { notes } = req.body;

  if (!notes || !notes.trim()) {
    return res.status(400).json({ error: "Notes required" });
  }

  try {
    // Generate summary
    const summaryResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Summarize clearly:\n\n${notes}` }],
    });

    const summary = summaryResp.choices[0].message.content;

    // Generate flashcards
    const flashcardResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Create 3-5 flashcards in JSON format from this text. Only respond with valid JSON array like [{"question":"...","answer":"..."}]:\n\n${notes}`,
        },
      ],
    });

    let flashcards = [];
    try {
      flashcards = JSON.parse(flashcardResp.choices[0].message.content);
      if (!Array.isArray(flashcards)) flashcards = [];
    } catch {
      flashcards = [];
    }

    // Add flipped flag for frontend
    flashcards = flashcards.map((c) => ({ ...c, flipped: false }));

    res.status(200).json({ summary, flashcards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate. Try again." });
  }
}
