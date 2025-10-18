import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { notes } = req.body; // parse JSON body
  if (!notes) return res.status(400).json({ error: "Notes required" });

  try {
    const summaryResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Summarize clearly:\n\n${notes}` }],
    });

    const quizResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Create 3-5 flashcards in JSON format: [{"question": "...", "answer": "..."}]\n\n${notes}`,
        },
      ],
    });

    const summary = summaryResp.choices[0].message.content.trim();
    let flashcards = [];
    try {
      flashcards = JSON.parse(quizResp.choices[0].message.content);
      if (!Array.isArray(flashcards)) flashcards = [];
    } catch {
      flashcards = [];
    }

    res.status(200).json({ summaries: [summary], flashcards });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({ error: err.message });
  }
}
