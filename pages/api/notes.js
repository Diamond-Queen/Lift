import OpenAI from "openai";
import pdfParse from "pdf-parse";
import fs from "fs/promises";
import formidable from "formidable";
import { extractPptx } from "pptx-content-extractor";

export const config = { api: { bodyParser: false } };

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Extract text from uploaded PDF or PPTX
async function extractTextPerBlock(file) {
  const mime = file.mimetype;
  const buffer = await fs.readFile(file.filepath);

  if (mime === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text.split("\f").map((page) => page.trim()).filter(Boolean);
  } else if (
    mime ===
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    const pptxData = await extractPptx(buffer);
    return pptxData.slides
      .map((slide, i) => {
        const note = pptxData.notes[i] || "";
        return [slide.text, note].filter(Boolean).join("\n");
      })
      .filter(Boolean);
  } else {
    throw new Error("Unsupported file type. Please upload PDF or PPTX.");
  }
}

export default async function handler(req, res) {
  try {
    let notesBlocks = [];

    // Handle JSON input
    if (req.headers["content-type"]?.includes("application/json")) {
      const body = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => resolve(JSON.parse(data)));
        req.on("error", reject);
      });
      if (body.notes) notesBlocks.push(body.notes);
    }
    // Handle file uploads (multipart/form-data)
    else if (req.headers["content-type"]?.includes("multipart/form-data")) {
      const form = new formidable.IncomingForm({ multiples: false });
      const formData = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve({ fields, files });
        });
      });

      if (formData.fields.notes) notesBlocks.push(formData.fields.notes);
      if (formData.files.file) {
        const extracted = await extractTextPerBlock(formData.files.file);
        notesBlocks.push(...extracted);
      }
    }

    if (!notesBlocks.length)
      return res.status(400).json({ error: "No notes provided" });

    // Generate summaries and flashcards
    const summaries = [];
    const flashcards = [];

    for (const block of notesBlocks) {
      const truncatedBlock = block.slice(0, 2000); // prevent token issues

      // Summary
      const summaryResp = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `Summarize clearly:\n\n${truncatedBlock}` }],
      });
      summaries.push(summaryResp.choices[0].message.content);

      // Flashcards
      const quizResp = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Create 3-5 flashcards in JSON [{"question":"...","answer":"..."}] from this text:\n\n${truncatedBlock}`,
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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
