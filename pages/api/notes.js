import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { notes } = req.body;
  if (!notes || !notes.trim())
    return res.status(400).json({ error: "Notes required" });

  try {
    const truncatedNotes = notes.slice(0, 2000);

    // Summary
    const summaryResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Summarize clearly:\n\n${truncatedNotes}` }],
    });

    // Flashcards
    const quizResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Create 3-5 flashcards in JSON format [{"question":"...","answer":"..."}] from this text:\n\n${truncatedNotes}`,
        },
      ],
    });

    let flashcards = [];
    try {
      flashcards = JSON.parse(quizResp.choices[0].message.content);
    } catch {
      flashcards = [];
    }

    res.status(200).json({
      summaries: [summaryResp.choices[0].message.content],
      flashcards: flashcards.map((q) => ({ ...q, flipped: false })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
