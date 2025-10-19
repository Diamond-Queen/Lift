import OpenAI from "openai";
import pdfParse from "pdf-parse";
import fs from "fs/promises";
import formidable from "formidable";
import { extractPptx } from "pptx-content-extractor";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const config = { api: { bodyParser: false } };

async function extractTextPerBlock(file) {
  const mime = file.mimetype;

  if (mime === "application/pdf") {
    const buffer = await fs.readFile(file.filepath);
    const data = await pdfParse(buffer);
    return data.text
      .split("\f")
      .map((page) => page.trim())
      .filter(Boolean);
  } else if (
    mime ===
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    const buffer = await fs.readFile(file.filepath);
    const pptxData = await extractPptx(buffer);
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

    // Make sure notes is a string
    const notesInput = typeof fields.notes === "string" ? fields.notes.trim() : "";
    let notesBlocks = notesInput ? [notesInput] : [];

    if (files.file) {
      try {
        const extractedBlocks = await extractTextPerBlock(files.file);
        notesBlocks = notesBlocks.concat(extractedBlocks);
      } catch (e) {
        return res
          .status(400)
          .json({ error: "Failed to extract text from file: " + e.message });
      }
    }

    if (!notesBlocks.length) return res.status(400).json({ error: "Notes required" });

    try {
      const summaries = [];
      const flashcards = [];

      for (const block of notesBlocks) {
        const truncatedBlock = block.slice(0, 3000); // safe token limit

        // Summary
        const summaryResp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "user", content: `Summarize clearly the following text:\n\n${truncatedBlock}` },
          ],
        });
        summaries.push(summaryResp.choices[0].message.content);

        // Flashcards
        const quizResp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `Create 3-5 flashcards in JSON format. Respond only as [{"question":"...","answer":"..."}]:\n\n${truncatedBlock}`,
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

        flashcards.push(...quiz.map((q) => ({ ...q, flipped: false })));
      }

      res.status(200).json({ summaries, flashcards });
    } catch (err) {
      console.error("OpenAI generation error:", err);
      res.status(500).json({ error: "Failed to generate. Try again." });
    }
  });
}
