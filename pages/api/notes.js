import OpenAI from "openai";

// Initialize OpenAI client using the environment variable
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
    const rawContent = flashcardsResp.choices[0].message.content;
    
    try {
      // FIX 1: Robust JSON parsing using regex to extract only the JSON block
      const jsonMatch = rawContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        flashcards = JSON.parse(jsonMatch[0]);
      }
      
      if (!Array.isArray(flashcards)) flashcards = [];
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError.message);
      // Fallback: if parsing failed, return an empty array for flashcards
      flashcards = [];
    }

    // FIX 2: Removed '.map((f) => ({ ...f, flipped: false }))' 
    // This state management belongs to the client component.

    // If a summary is returned as a single block of text with internal newlines, 
    // it's better to process it into an array of paragraphs for display.
    const summaries = summary.split('\n\n').filter(p => p.trim() !== '');

    res.status(200).json({ summaries: summaries, flashcards });
  } catch (err) {
    console.error(err);
    // Return a 500 status with an error message
    res.status(500).json({ error: err.message || "An unexpected error occurred in the API." });
  }
}