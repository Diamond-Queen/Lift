import OpenAI from "openai";
import pdfParse from "pdf-parse";
import fs from "fs/promises";
import formidable from "formidable";
import { extractPptx } from "pptx-content-extractor";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Allow file uploads
export const config = { api: { bodyParser: false } };

// Extract text from PDF or PPTX
async function extractTextPerBlock(file) {
  const mime = file.mimetype;

  if (mime === "application/pdf") {
    const buffer = await fs.readFile(file.filepath);
    const data = await pdfParse(buffer);
    return data.text.split("\f").map(p => p.trim()).filter(Boolean);
  } else if (
    mime ===
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    const buffer = await fs.readFile(file.filepath);
    const pptxData = await extractPptx(buffer); // slides + notes
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

  const isMultipart = req.headers["content-type"]?.includes("multipart/form-data");

  let notesBlocks = [];

  if (isMultipart) {
    // Handle file uploads
    const form = new formidable.IncomingForm({ multiples: false });

    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(500).json({ error: err.message });

      if (fields.notes) notesBlocks.push(fields.notes);

      if (files.file) {
        try {
          const extracted = await extractTextPerBlock(files.file);
          notesBlocks.push(...extracted);
        } catch (e) {
          return res.status(400).json({ error: "Failed to extract file: " + e.message });
        }
      }

      if (!notesBlocks.length) return res.status(400).json({ error: "No notes provided" });

      await generateSummariesAndFlashcards(notesBlocks, res);
    });
  } else {
    // Plain JSON POST (typed notes)
    try {
      const body = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", chunk => data += chunk);
        req.on("end", () => resolve(JSON.parse(data)));
        req.on("error", reject);
      });

      if (!body.notes || !body.notes.trim())
        return res.status(400).json({ error: "No notes provided" });

      notesBlocks.push(body.notes);

      await generateSummariesAndFlashcards(notesBlocks, res);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Invalid JSON" });
    }
  }
}

// Generate summaries + flashcards
async function generateSummariesAndFlashcards(blocks, res) {
  try {
    const summaries = [];
    const flashcards = [];

    for (const block of blocks) {
      const truncated = block.slice(0, 2000); // prevent token overflow

      // Summary
      const summaryResp = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `Summarize clearly:\n\n${truncated}` }],
      });
      const summary = summaryResp.choices[0].message.content;
      summaries.push(summary);

      // Flashcards
      const quizResp = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Create 3-5 flashcards in JSON format only, [{"question":"...","answer":"..."}]:\n\n${truncated}`,
          },
        ],
      });

      let quiz = [];
      try {
        quiz = JSON.parse(quizResp.choices[0].message.content);
        if (!Array.isArray(quiz)) quiz = [];
      } catch {
        // fallback parsing: simple Q/A lines
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

    res.status(200).json({ summaries, flashcards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
