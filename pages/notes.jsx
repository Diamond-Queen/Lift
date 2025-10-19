"use client";

import { useState } from "react";
import JSZip from "jszip";
import styles from "../styles/Notes.module.css";

// ========== PDF Extraction (Manual, No Libraries) ==========
async function extractTextFromPdf(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const rawText = new TextDecoder("latin1").decode(bytes);

  const streamRegex = /stream([\s\S]*?)endstream/g;
  const streams = [...rawText.matchAll(streamRegex)];
  let extracted = "";

  for (const s of streams) {
    const content = s[1].trimStart();
    try {
      const inflated = await decompressFlate(content);
      extracted += parsePdfTextOps(inflated);
    } catch {
      extracted += parsePdfTextOps(content);
    }
  }

  // Add any text found directly outside streams
  extracted += parsePdfTextOps(rawText);
  return extracted.replace(/\s+/g, " ").trim();
}

async function decompressFlate(data) {
  const uint8Array = new TextEncoder().encode(data);
  const ds = new DecompressionStream("deflate");
  const stream = new Response(new Blob([uint8Array]).stream().pipeThrough(ds));
  return await stream.text();
}

function parsePdfTextOps(text) {
  let extracted = "";
  const btEt = /BT([\s\S]*?)ET/g;
  const blocks = [...text.matchAll(btEt)];
  for (const b of blocks) {
    const matches = [...b[1].matchAll(/\(([^)]+)\)\s*T[Jj]/g)];
    for (const m of matches) extracted += m[1] + " ";
  }
  if (!extracted.trim()) {
    const fallback = [...text.matchAll(/\(([^)]+)\)/g)];
    extracted = fallback.map((m) => m[1]).join(" ");
  }
  return extracted;
}

// ========== PPTX Extraction ==========
async function extractTextFromPptx(file) {
  const zip = await JSZip.loadAsync(file);
  let text = "";

  const slides = Object.keys(zip.files).filter((f) =>
    f.match(/^ppt\/slides\/slide\d+\.xml$/)
  );

  for (const path of slides) {
    const xml = await zip.files[path].async("text");
    const matches = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)];
    matches.forEach((m) => (text += m[1] + "\n"));
  }

  return text.trim();
}

// ========== Main Component ==========
export default function Notes() {
  const [input, setInput] = useState("");
  const [summaries, setSummaries] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // File upload handler
  const handleFileChange = async (e) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      let extractedText = "";

      if (file.name.toLowerCase().endsWith(".pptx")) {
        const arrayBuffer = await file.arrayBuffer();
        extractedText = await extractTextFromPptx(arrayBuffer);
      } else if (file.name.toLowerCase().endsWith(".pdf")) {
        extractedText = await extractTextFromPdf(file);
      } else {
        throw new Error("Unsupported file type. Use PDF or PPTX.");
      }

      if (!extractedText.trim()) throw new Error("No readable text found.");

      setInput((prev) =>
        prev ? prev + "\n\n" + extractedText.trim() : extractedText.trim()
      );

      e.target.value = "";
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to extract text.");
    } finally {
      setLoading(false);
    }
  };

  // Generate summaries + flashcards
  const handleGenerate = async () => {
    if (!input.trim()) return setError("Please paste or upload notes first.");

    setError("");
    setLoading(true);
    setSummaries([]);
    setFlashcards([]);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: input }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Limit flashcards to 12
      const flashcardsLimited = (data.flashcards || []).slice(0, 12);
      setSummaries(data.summaries || []);
      setFlashcards(flashcardsLimited);
    } catch (err) {
      console.error(err);
      setError("Failed to generate. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFlashcard = (index) => {
    setFlashcards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, flipped: !c.flipped } : c))
    );
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Lift Notes</h1>

      <textarea
        className={styles.textarea}
        rows={8}
        placeholder="Paste notes here or upload a file..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <div className={styles.controls}>
        <input
          type="file"
          accept=".pdf,.pptx"
          onChange={handleFileChange}
          className={styles.fileInput}
        />
        <button
          className={`${styles.btnAction} ${loading ? styles.loading : ""}`}
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {summaries.length > 0 && (
        <div className={styles.resultCard}>
          <h2>Summaries</h2>
          {summaries.map((s, i) => (
            <p key={i}>{s}</p>
          ))}
        </div>
      )}

      {flashcards.length > 0 && (
        <div className={styles.flashcardsContainer}>
          <h2>Flashcards</h2>
          <div className={styles.flashcardsGrid}>
            {flashcards.map((c, i) => (
              <div
                key={i}
                className={`${styles.flashcard} ${
                  c.flipped ? styles.flipped : ""
                }`}
                onClick={() => toggleFlashcard(i)}
              >
                <div className={styles.front}>
                  <p>{c.question}</p>
                </div>
                <div className={styles.back}>
                  <p>{c.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
