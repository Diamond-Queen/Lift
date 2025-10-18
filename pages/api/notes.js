import OpenAI from "openai";
import pdfParse from "pdf-parse";
import fs from "fs/promises";
import formidable from "formidable";
import pptxParser from "pptx-parser"; 

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const config = { api: { bodyParser: false } };

async function extractTextPerBlock(file) {
  const mime = file.mimetype;

  if (mime === "application/pdf") {
    const buffer = await fs.readFile(file.filepath);
    const data = await pdfParse(buffer);
    return data.text.split("\f").map((page) => page.trim()).filter(Boolean);
  } else if (
    mime ===
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    const buffer = await fs.readFile(file.filepath);
    const slides = await pptxParser(buffer); // returns array of slide objects
    return slides.map((s) => s.text).filter(Boolean);
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

    let notesBlocks = fields.notes ? [fields.notes] : [];

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
      return res.status(400).json({ error: "No notes provided" });

    try {
      const summaries = [];
      const flashcards = [];

      for (const block of notesBlocks) {
        const truncatedBlock = block.slice(0, 2000); // prevents token limit issues

        // Summary
        const summaryResp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "user", content: `Summarize clearly:\n\n${truncatedBlock}` },
          ],
        });
        const summary = summaryResp.choices[0].message.content;
        summaries.push(summary);

        // Flashcards
        const quizResp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `Create 3-5 flashcards in JSON format from this text. Use [{"question": "...", "answer": "..."}] only:\n\n${truncatedBlock}`,
            },
          ],
        });

        let quiz = [];
        try {
          quiz = JSON.parse(quizResp.choices[0].message.content);
          if (!Array.isArray(quiz)) quiz = [];
        } catch {
          // fallback: simple regex parser
          const lines = quizResp.choices[0].message.content.split("\n");
          quiz = lines
            .filter((l) => l.includes("Q:") || l.includes("A:"))
            .reduce((acc, line, i, arr) => {
              if (line.startsWith("Q:")) acc.push({ question: line.slice(2).trim(), answer: "" });
              else if (line.startsWith("A:") && acc.length) acc[acc.length - 1].answer = line.slice(2).trim();
              return acc;
            }, []);
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
