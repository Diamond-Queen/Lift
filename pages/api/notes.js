import OpenAI from "openai";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import formidable from "formidable";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = { api: { bodyParser: false } };

async function extractTextPerBlock(file) {
  const mime = file.mimetype;

  if (mime === "application/pdf") {
    const data = await pdfParse(file.buffer);
    // PDF pages are separated by \f in pdf-parse
    return data.text.split("\f").map((page) => page.trim()).filter(Boolean);
  } else if (mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    // PPTX slides separated by newlines with "Slide" keywords (basic heuristic)
    return result.value
      .split(/\n(?=Slide \d+)/)
      .map((slide) => slide.trim())
      .filter(Boolean);
  } else {
    throw new Error("Unsupported file type");
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const form = new formidable.IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    let notesBlocks = fields.notes ? [fields.notes] : [];

    if (files.file) {
      try {
        const extractedBlocks = await extractTextPerBlock(files.file);
        notesBlocks = notesBlocks.concat(extractedBlocks);
      } catch (e) {
        return res.status(400).json({ error: "Failed to extract text from file: " + e.message });
      }
    }

    if (!notesBlocks.length) return res.status(400).json({ error: "No notes provided" });

    try {
      const summaries = [];
      const flashcards = [];

      for (const block of notesBlocks) {
        // Generate summary
        const summaryResp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: `Summarize clearly:\n\n${block}` }],
        });

        const summary = summaryResp.choices[0].message.content;

        // Generate flashcards
        const quizResp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `Create 3-5 quiz questions and answers from this text. Respond ONLY with valid JSON array: [{"question": "...", "answer": "..."}, ...]\n\nText:\n${block}`,
            },
          ],
        });

        let quiz = [];
        try {
          quiz = JSON.parse(quizResp.choices[0].message.content);
          if (!Array.isArray(quiz)) quiz = [];
        } catch {
          quiz = [];
        }

        summaries.push(summary);
        flashcards.push(...quiz.map((q) => ({ ...q, flipped: false })));
      }

      res.status(200).json({ summaries, flashcards });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
}
