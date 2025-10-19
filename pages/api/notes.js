import OpenAI from "openai";
import pdfParse from "pdf-parse";
import fs from "fs/promises";
import formidable from "formidable";
import unzipper from "unzipper";
import { parseStringPromise } from "xml2js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const config = { api: { bodyParser: false } };

// Extract text from PPTX without DOM APIs
async function extractPptxText(filePath) {
  const slides = [];
  const directory = await unzipper.Open.file(filePath);

  for (const entry of directory.files) {
    if (entry.path.startsWith("ppt/slides/slide") && entry.path.endsWith(".xml")) {
      const content = await entry.buffer();
      const xml = await parseStringPromise(content);
      const textRuns = [];

      const collectText = (obj) => {
        if (typeof obj === "object") {
          for (const key in obj) {
            if (key === "a:t") {
              textRuns.push(obj[key].join(" "));
            } else {
              collectText(obj[key]);
            }
          }
        }
      };

      collectText(xml);
      slides.push(textRuns.join(" ").trim());
    }
  }

  return slides.filter(Boolean);
}

async function extractTextPerBlock(file) {
  const mime = file.mimetype;

  if (mime === "application/pdf") {
    const buffer = await fs.readFile(file.filepath);
    const data = await pdfParse(buffer);
    return data.text.split("\f").map((page) => page.trim()).filter(Boolean);
  } else if (
    mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return await extractPptxText(file.filepath);
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

    let notesBlocks = [];
    if (fields.notes && fields.notes.trim()) notesBlocks.push(fields.notes.trim());

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

    if (!notesBlocks.length)
      return res.status(400).json({ error: "Notes required" });

    try {
      const summaries = [];
      const flashcards = [];

      for (const block of notesBlocks) {
        const truncatedBlock = block.slice(0, 2000);

        // Summarize
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
              content: `Create 3-5 flashcards as JSON [{"question":"...","answer":"..."}] from this text:\n\n${truncatedBlock}`,
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
  });
}
