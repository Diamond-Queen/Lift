import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { notes } = req.body;

    if (!notes || typeof notes !== "string" || !notes.trim()) {
      return res.status(400).json({ error: "Notes required" });
    }

    const truncated = notes.slice(0, 5000);

    //  Summary
    const summaryResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: `Summarize this clearly and concisely:\n\n${truncated}` },
      ],
    });

    const summary = summaryResp.choices[0].message.content;

    // Flashcards
    const flashResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Create 5 educational flashcards in JSON format [{"question":"...","answer":"..."}] from this text:\n\n${truncated}`,
        },
      ],
    });

    let flashcards = [];
    try {
      flashcards = JSON.parse(flashResp.choices[0].message.content);
    } catch {
      flashcards = [];
    }

    res.status(200).json({
      summaries: [summary],
      flashcards: flashcards.map((f) => ({ ...f, flipped: false })),
    });
  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: "Failed to generate" });
  }
}
