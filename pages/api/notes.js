import OpenAI from "openai";
import pdfParse from "pdf-parse";
import fs from "fs/promises";
import formidable from "formidable";
import { extractPptxText } from "pptx-extract"; // more reliable PPTX parser

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const config = { api: { bodyParser: false } };

async function extractTextPerBlock(file) {
  const mime = file.mimetype;
  const buffer = await fs.readFile(file.filepath);

  if (mime === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text.split("\f").map((p) => p.trim()).filter(Boolean);
  } else if (mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    const slides = await extractPptxText(buffer);
    return slides.map((s) => s.text).filter(Boolean);
  } else {
    throw new Error("Unsupported file type");
  }
}

function chunkText(text, chunkSize = 1500) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize;
  }
  return chunks;
}

function parseFlashcards(raw) {
  try {
    // strip ```json ... ``` code block if exists
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // fallback to Q/A lines
    const lines = raw.split("\n");
    return lines
      .filter((l) => l.startsWith("Q:") || l.startsWith("A:"))
      .reduce((acc, line) => {
        if (line.startsWith("Q:")) acc.push({ question: line.slice(2).trim(), answer: "" });
        else if (line.startsWith("A:") && acc.length) acc[acc.length - 1].answer = line.slice(2).trim();
        return acc;
      }, []);
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
        return res.status(400).json({ error: "Failed to extract text: " + e.message });
      }
    }

    if (!notesBlocks.length) return res.status(400).json({ error: "No notes provided" });

    try {
      const summaries = [];
      const flashcards = [];

      for (const block of notesBlocks) {
        const chunks = chunkText(block);

        for (const chunk of chunks) {
          // Generate summary
          const summaryResp = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: `Summarize clearly:\n\n${chunk}` }],
          });
          summaries.push(summaryResp.choices[0].message.content.trim());

          // Generate flashcards in strict JSON format
          const flashResp = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: `Create 3-5 flashcards in JSON only from this text. Respond in code block like: \`\`\`json [{"question":"...","answer":"..."}]\`\`\`\n\n${chunk}`,
              },
            ],
          });

          const parsed = parseFlashcards(flashResp.choices[0].message.content);
          flashcards.push(...parsed.map((q) => ({ ...q, flipped: false })));
        }
      }

      res.status(200).json({ summaries, flashcards });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
}
