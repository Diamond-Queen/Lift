import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { notes } = req.body;
  if (!notes) return res.status(400).json({ error: "Notes required" });

  try {
    const summaryPrompt = `Summarize clearly:\n\n${notes}`;
    const quizPrompt = `Create 5 quiz questions and answers from these notes. Respond ONLY with valid JSON array: [{"question": "...", "answer": "..."}, ...]\n\nNotes:\n${notes}`;

    const [summaryResp, quizResp] = await Promise.all([
      client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: summaryPrompt }],
      }),
      client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: quizPrompt }],
      }),
    ]);

    const summary = summaryResp.choices[0].message.content;

    let quiz = [];
    try {
      quiz = JSON.parse(quizResp.choices[0].message.content);
      if (!Array.isArray(quiz)) quiz = [];
    } catch {
      // fallback: parse lines if JSON fails
      quiz = quizResp.choices[0].message.content
        .split("\n")
        .filter(Boolean)
        .map((line) => ({ question: line, answer: "" }));
    }

    res.status(200).json({ summary, quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
