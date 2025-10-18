import OpenAI from "openai";
import pdfParse from "pdf-parse";
import fs from "fs/promises";
import formidable from "formidable";
import { extractPptx } from "pptx-content-extractor";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const config = { api: { bodyParser: false } };

async function extractTextPerBlock(file) {
  const mime = file.mimetype;
  const buffer = await fs.readFile(file.filepath);

  if (mime === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text.split("\f").map(p => p.trim()).filter(Boolean);
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
    throw new Error("Unsupported file type");
  }
}

async function generateSummariesAndFlashcards(notesBlocks) {
  const summaries = [];
  const flashcards = [];

  for (const block of notesBlocks) {
    const truncated = block.slice(0, 2000);

    // Summary
    const summaryResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Summarize clearly:\n\n${truncated}` }],
    });
    summaries.push(summaryResp.choices[0].message.content);

    // Flashcards
    const quizResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Create 3-5 flashcards in JSON format [{"question":"...","answer":"..."}] only:\n\n${truncated}`,
        },
      ],
    });

    let quiz = [];
    try {
      quiz = JSON.parse(quizResp.choices[0].message.content);
      if (!Array.isArray(quiz)) quiz = [];
    } catch {
      // fallback parser for Q/A
      const lines = quizResp.choices[0].message.content.split("\n");
      quiz = lines
        .filter(l => l.startsWith("Q:") || l.startsWith("A:"))
        .reduce((acc, line) => {
          if (line.startsWith("Q:")) acc.push({ question: line.slice(2).trim(), answer: "" });
          else if (line.startsWith("A:") && acc.length)
            acc[acc.length - 1].answer = line.slice(2).trim();
          return acc;
        }, []);
    }

    flashcards.push(...quiz.map(q => ({ ...q, flipped: false })));
  }

  return { summaries, flashcards };
}

export default async function handler(req, res) {
  try {
    const contentType = req.headers["content-type"] || "";

    if (contentType.includes("multipart/form-data")) {
      // Handle file uploads
      const form = new formidable.IncomingForm({ multiples: false });
      form.parse(req, async (err, fields, files) => {
        if (err) return res.status(500).json({ error: err.message });

        let notesBlocks = [];
        if (fields.notes) notesBlocks.push(fields.notes);

        if (files.file) {
          try {
            const extracted = await extractTextPerBlock(files.file);
            notesBlocks.push(...extracted);
          } catch (e) {
            return res.status(400).json({ error: "File extraction failed: " + e.message });
          }
        }

        if (!notesBlocks.length) return res.status(400).json({ error: "No notes provided" });

        const result = await generateSummariesAndFlashcards(notesBlocks);
        res.status(200).json(result);
      });
    } else if (contentType.includes("application/json")) {
      // Handle JSON body (typed notes)
      let body = "";
      for await (const chunk of req) body += chunk;
      const data = JSON.parse(body);

      if (!data.notes || !data.notes.trim())
        return res.status(400).json({ error: "No notes provided" });

      const result = await generateSummariesAndFlashcards([data.notes]);
      res.status(200).json(result);
    } else {
      return res.status(400).json({ error: "Unsupported content type" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
