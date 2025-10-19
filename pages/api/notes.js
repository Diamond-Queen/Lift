import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { notes } = req.body;
    if (!notes || !notes.trim()) return res.status(400).json({ error: "Notes required" });

    // --- Summarize notes ---
    const summaryResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Summarize clearly:\n\n${notes}` }],
    });

    const summary = summaryResp.choices[0].message.content;

    // --- Generate 12 flashcards ---
    const flashcardsResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Create exactly 12 flashcards from the following text. Respond ONLY with valid JSON in this format:
[
  {"question":"...","answer":"..."},
  ...
]
Text:
${notes}`
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

    // Add flipped property for frontend
    flashcards = flashcards.map((f) => ({ ...f, flipped: false }));

    res.status(200).json({ summaries: [summary], flashcards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
