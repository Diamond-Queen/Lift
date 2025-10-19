import OpenAI from "openai";
import pdfParse from "pdf-parse";
import fs from "fs/promises";
import formidable from "formidable";
import { extractPptx } from "pptx-content-extractor";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Disable Next.js body parsing so formidable can handle files
export const config = { api: { bodyParser: false } };

// Extract text per block from PDF or PPTX
async function extractTextPerBlock(file) {
  const mime = file.mimetype;

  if (mime === "application/pdf") {
    const buffer = await fs.readFile(file.filepath);
    const data = await pdfParse(buffer);
    return data.text
      .split("\f") // PDF pages
      .map((page) => page.trim())
      .filter(Boolean);
  } else if (
    mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    const buffer = await fs.readFile(file.filepath);
    const pptxData = await extractPptx(buffer); // { slides: [], notes: [] }
    return pptxData.slides
      .map((slide, i) => {
        const note = pptxData.notes[i] || "";
        return [slide.text, note].filter(Boolean).join("\n");
      })
      .filter(Boolean);
  } else {
    throw new Error("Unsupported file type");
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const form = new formidable.IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    try {
      let notesBlocks = [];

      // Handle pasted notes
      if (fields.notes) {
        if (Array.isArray(fields.notes)) notesBlocks.push(fields.notes[0]);
        else notesBlocks.push(fields.notes);
      }

      // Handle uploaded file
      if (files.file) {
        const fileObj = Array.isArray(files.file) ? files.file[0] : files.file;
        const extractedBlocks = await extractTextPerBlock(fileObj);
        notesBlocks = notesBlocks.concat(extractedBlocks);
      }

      console.log("notesBlocks received:", notesBlocks);

      if (!notesBlocks.length)
        return res.status(400).json({ error: "Notes required" });

      const summaries = [];
      const flashcards = [];

      for (const block of notesBlocks) {
        const truncatedBlock = block.slice(0, 3000); // prevent token overflow

        // --- Generate summary ---
        const summaryResp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "user", content: `Summarize the following notes clearly:\n\n${truncatedBlock}` },
          ],
        });
        const summary = summaryResp.choices[0].message.content;
        summaries.push(summary);

        // --- Generate flashcards ---
        const quizResp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `Create 3-5 flashcards from this text. Respond ONLY with valid JSON array of objects like [{"question":"...","answer":"..."}]:\n\n${truncatedBlock}`,
            },
          ],
        });

        let quiz = [];
        try {
          quiz = JSON.parse(quizResp.choices[0].message.content);
          if (!Array.isArray(quiz)) quiz = [];
        } catch {
          // fallback parser for malformed JSON
          const lines = quizResp.choices[0].message.content.split("\n");
          quiz = lines
            .filter((l) => l.includes("Q:") || l.includes("A:"))
            .reduce((acc, line) => {
              if (line.startsWith("Q:"))
                acc.push({ question: line.slice(2).trim(), answer: "" });
              else if (line.startsWith("A:") && acc.length)
                acc[acc.length - 1].answer = line.slice(2).trim();
              return acc;
            }, []);
        }

        flashcards.push(...quiz.map((q) => ({ ...q, flipped: false })));
      }

      res.status(200).json({ summaries, flashcards });
    } catch (err) {
      console.error("Generation error:", err);
      res.status(500).json({ error: "Failed to generate notes: " + err.message });
    }
  });
}
