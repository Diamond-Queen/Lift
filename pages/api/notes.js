import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { notes } = req.body;
  if (!notes) return res.status(400).json({ error: "Notes required" });

  try {
    // Prompts
    const summaryPrompt = `Summarize clearly:\n\n${notes}`;
    const quizPrompt = `Create 5 quiz questions (Q&A) from:\n\n${notes}`;

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

    // Try parsing quiz into structured array if possible
    let quizRaw = quizResp.choices[0].message.content;
    let quiz = [];

    try {
      quiz = JSON.parse(quizRaw);
      if (!Array.isArray(quiz)) quiz = [];
    } catch {
      // fallback: parse manually (split by lines)
      quiz = quizRaw.split("\n").filter(Boolean).map((line, i) => ({
        question: line,
        answer: "",
      }));
    }

    res.status(200).json({ summary, quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

