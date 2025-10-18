

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { notes } = req.body;
  if (!notes) return res.status(400).json({ error: "Notes required" });

  try {
    const summaryPrompt = `Summarize clearly:\n\n${notes}`;
    const quizPrompt = `Create 5 quiz questions from:\n\n${notes}`;

    const [summary, quiz] = await Promise.all([
      client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: summaryPrompt }],
      }),
      client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: quizPrompt }],
      }),
    ]);

    res.status(200).json({
      summary: summary.choices[0].message.content,
      quiz: quiz.choices[0].message.content,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
