"use client";

import { useState } from "react";
import JSZip from "jszip";
import styles from "../styles/Notes.module.css";

export default function Notes() {
  const [input, setInput] = useState("");
  const [flashcards, setFlashcards] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // -------------------------
  // PPTX extraction (JSZip)
  // -------------------------
  const extractTextFromPptx = async (arrayBuffer) => {
    const zip = await JSZip.loadAsync(arrayBuffer);
    let text = "";

    const slideFiles = Object.keys(zip.files).filter((f) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(f)
    );

    for (const slidePath of slideFiles) {
      const slideXml = await zip.files[slidePath].async("text");
      // grab text nodes <a:t>...</a:t>
      const matches = [...slideXml.matchAll(/<a:t>(.*?)<\/a:t>/g)];
      matches.forEach((m) => {
        text += m[1] + "\n";
      });
    }
    return text.trim();
  };

        
        async function extractTextFromPdf(file) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // Convert buffer to text for uncompressed sections
        const rawText = new TextDecoder("latin1").decode(bytes);

        // Step 1: Extract all raw "stream" sections
        const streamRegex = /stream([\s\S]*?)endstream/g;
        const streams = [...rawText.matchAll(streamRegex)];

        let decodedText = "";

        for (const s of streams) {
          const streamData = s[1].trimStart();

          // Step 2: Convert back to bytes for potential decompression
          const streamBytes = new TextEncoder().encode(streamData);

          try {
            // Step 3: Try to inflate (decompress) the stream using built-in browser API
            const decompressed = await decompressFlate(streamBytes);
            decodedText += parsePdfTextOps(decompressed);
          } catch {
            // If not compressed, just parse as-is
            decodedText += parsePdfTextOps(streamData);
          }
        }

        // Step 4: Fallback — also parse uncompressed text objects directly
        decodedText += parsePdfTextOps(rawText);

        return decodedText.replace(/\s+/g, " ").trim();
      }

      // Utility: Decompress Flate (zlib/deflate) PDF streams
      async function decompressFlate(uint8Array) {
        const cs = new DecompressionStream("deflate");
        const stream = new Response(new Blob([uint8Array]).stream().pipeThrough(cs));
        return await stream.text();
      }

      // Utility: Parse BT/ET text operators and extract strings inside ( ... )
      function parsePdfTextOps(text) {
        let extracted = "";

        // Find text between BT/ET blocks (PDF text objects)
        const btEtRegex = /BT([\s\S]*?)ET/g;
        const blocks = [...text.matchAll(btEtRegex)];

        for (const block of blocks) {
          // Match text shown with Tj or TJ operators

          const textMatches = [...block[1].matchAll(/\(([^)]+)\)\s*T[Jj]/g)];
          for (const m of textMatches) {
            extracted += m[1] + " ";
          }
        }

  // If nothing found, try plain parentheses
  if (!extracted.trim()) {
    const fallback = [...text.matchAll(/\(([^)]+)\)/g)];
    extracted = fallback.map((m) => m[1]).join(" ");
  }

  return extracted;
}

// --- Your file handler ---
const handleFileChange = async (e) => {
  setError("");
  const file = e.target.files?.[0];
  if (!file) return;

  setLoading(true);
  try {
    let extractedText = "";

    // PPTX support
    if (file.name.toLowerCase().endsWith(".pptx")) {
      const buffer = await file.arrayBuffer();
      extractedText = await extractTextFromPptx(buffer);
    }

    //  PDF support
    else if (file.name.toLowerCase().endsWith(".pdf")) {
      extractedText = await extractTextFromPdf(file);
    }


    //  Unsupported file
    else {
      throw new Error("Unsupported file type. Use PDF or PPTX.");
    }

    if (!extractedText || !extractedText.trim()) {
      throw new Error("No readable text found in file.");
    }

    // Append extracted text to textarea (not file path)
    setInput((prev) =>
      prev ? prev.trim() + "\n\n" + extractedText.trim() : extractedText.trim()
    );

    //  Allow re-upload of same file
    e.target.value = "";
  } catch (err) {
    console.error(err);
    setError(err.message || "Failed to extract text from file.");
  } finally {
    setLoading(false);
  }
};


  // -------------------------
  // Generate summary + flashcards
  // -------------------------
  const handleGenerate = async () => {
    setError("");
    if (!input.trim()) {
      setError("Please paste notes or upload a file first.");
      return;
    }

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
      if (data.error) {
        setError(data.error);
      } else {
        setSummaries(data.summaries || []);
        // ensure each card has flipped prop
        setFlashcards((data.flashcards || []).slice(0, 12).map((f) => ({ ...f, flipped: false })));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Flashcard flip (in-place)
  // -------------------------
  const toggleFlashcard = (index) => {
    setFlashcards((prev) => prev.map((c, i) => (i === index ? { ...c, flipped: !c.flipped } : c)));
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Lift Notes</h1>

      <textarea
        className={styles.textarea}
        rows={6}
        placeholder="Paste your notes here or upload a PDF/PPTX..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <label className={styles.fileButton}>
          Browse Files
          <input type="file" accept=".pdf,.pptx" onChange={handleFileChange} hidden />
        </label>

        <button className={`${styles.generateButton} ${loading ? styles.loading : ""}`} onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {summaries.length > 0 && (
        <div className={styles.resultCard}>
          <h2 className={styles.resultTitle}>Summaries</h2>
          {summaries.map((s, idx) => (
            <p key={idx}>{s}</p>
          ))}
        </div>
      )}

      {flashcards.length > 0 && (
        <div className={styles.flashcardsContainer}>
          <h2 className={styles.resultTitle}>Flashcards</h2>
          <div className={styles.flashcardsSlider}>
            {flashcards.map((card, i) => (
              <div
                key={i}
                className={`${styles.flashcard} ${card.flipped ? styles.flipped : ""}`}
                onClick={() => toggleFlashcard(i)}
              >
                <div className={styles.front}>
                  <p>{card.question}</p>
                </div>
                <div className={styles.back}>
                  <p>{card.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
