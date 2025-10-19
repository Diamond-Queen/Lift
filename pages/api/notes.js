import OpenAI from "openai";
import pdfParse from "pdf-parse";
import fs from "fs/promises";
import formidable from "formidable";
import { extractPptx } from "pptx-content-extractor";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Disable Next.js body parser
export const config = { api: { bodyParser: false } };

// Helper to extract text from PDF or PPTX
async function extractTextPerBlock(file) {
  const mime = file.mimetype;

  if (mime === "application/pdf") {
    const buffer = await fs.readFile(file.filepath);
    const data = await pdfParse(buffer);
    // Split pages
    return data.text
      .split("\f")
      .map((page) => page.trim())
      .filter(Boolean);
  } else if (
    mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    const buffer = await fs.readFile(file.filepath);
    const pptxData = await extractPptx(buffer);
    // Combine slide text + notes
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
    if (err) {
      console.error("Formidable parse error:", err);
      return res.status(500).json({ error: err.message });
    }

    console.log("FIELDS:", fields);
    console.log("FILES:", files);

    // Ensure notes field is a string
    let notesInput = "";
    if (fields.notes) {
      notesInput = Array.isArray(fields.notes) ? fields.notes[0].trim() : fields.notes.trim();
    }

    // Collect text blocks
    let notesBlocks = [];
    if (notesInput) notesBlocks.push(notesInput);

    if (files.file) {
      try {
        const extractedBlocks = await extractTextPerBlock(files.file);
        notesBlocks = notesBlocks.concat(extractedBlocks);
      } catch (e) {
        console.error("File extraction error:", e);
        return res.status(400).json({ error: "Failed to extract text from file: " + e.message });
      }
    }

    if (!notesBlocks.length) {
      console.warn("No notes received");
      return res.status(400).json({ error: "Notes required" });
    }

    try {
      const summaries = [];
      const flashcards = [];

      for (const block of notesBlocks) {
        // Prevent token overflow
        const truncatedBlock = block.slice(0, 2000);

        // --- Summary ---
        const summaryResp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: `Summarize clearly:\n\n${truncatedBlock}` }],
        });
        const summaryText = summaryResp.choices[0]?.message?.content || "";
        summaries.push(summaryText);

        // --- Flashcards ---
        const flashcardResp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `Create 3-5 flashcards in JSON format from this text. Use [{"question":"...","answer":"..."}] only:\n\n${truncatedBlock}`,
            },
          ],
        });

        let quiz = [];
        try {
          quiz = JSON.parse(flashcardResp.choices[0]?.message?.content || "[]");
          if (!Array.isArray(quiz)) quiz = [];
        } catch (parseErr) {
          console.warn("Flashcard JSON parse failed:", parseErr);
          quiz = [];
        }

        flashcards.push(...quiz.map((q) => ({ ...q, flipped: false })));
      }

      console.log("Summaries generated:", summaries.length, "Flashcards:", flashcards.length);
      res.status(200).json({ summaries, flashcards });
    } catch (openaiErr) {
      console.error("OpenAI generation error:", openaiErr);
      res.status(500).json({ error: "OpenAI generation failed: " + openaiErr.message });
    }
  });
}
