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

  // ---------------------------------------------------
  // PDF extraction (simple, browser-only fallback)
  // ---------------------------------------------------
  // NOTE: this is a heuristic that works for many text-based PDFs.
  // It's not as reliable as pdf.js but avoids server/worker issues.
  const extractTextFromPdf = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    // Try to decode as UTF-8 text first (many PDFs embed text streams)
    try {
      const decoder = new TextDecoder("utf-8");
      let raw = decoder.decode(arrayBuffer);
      // Remove long sequences of binary garbage - keep printable ranges
      // Replace <>[](){} etc that are common in PDF binary parts with spaces
      raw = raw.replace(/[\x00-\x1F\x7F-\x9F]+/g, " ");
      // Try to extract readable words groups - some PDFs include the text as-is
      const words = raw.match(/[A-Za-z0-9][A-Za-z0-9\-\_\.,;:'"() ]{1,200}/g);
      if (words && words.length) {
        // Join the biggest chunks to produce a reasonable "text"
        return words.slice(0, 2000).join(" ").replace(/\s{2,}/g, " ").trim();
      }
    } catch (err) {
      // ignore and fallback to naive approach below
      console.warn("utf-8 decode fallback failed", err);
    }

    // Final fallback: attempt to interpret as Latin1-ish
    try {
      let binary = "";
      const uint8 = new Uint8Array(arrayBuffer);
      // build string in chunks to avoid stack limits
      const chunk = 0x8000;
      for (let i = 0; i < uint8.length; i += chunk) {
        const sub = uint8.subarray(i, i + chunk);
        binary += String.fromCharCode.apply(null, sub);
      }
      // strip lots of non-printable characters
      let cleaned = binary.replace(/[\x00-\x1F\x7F-\x9F]+/g, " ");
      cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
      // return first useful part
      return cleaned.slice(0, 20000);
    } catch (err) {
      console.error("PDF extraction fallback failed", err);
      return "";
    }
  };

  // -------------------------
  // File input handler
  // -------------------------
  const handleFileChange = async (e) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      let extractedText = "";

      // PPTX
      if (file.name.toLowerCase().endsWith(".pptx")) {
        const buffer = await file.arrayBuffer();
        extractedText = await extractTextFromPptx(buffer);
      }
      // PDF
      else if (file.name.toLowerCase().endsWith(".pdf")) {
        extractedText = await extractTextFromPdf(file);
      } else {
        throw new Error("Unsupported file type. Use PDF or PPTX.");
      }

      if (!extractedText || !extractedText.trim()) {
        throw new Error("No readable text found in file.");
      }

      // Append extracted text to textarea (don't insert file path)
      setInput((prev) => (prev ? prev.trim() + "\n\n" + extractedText.trim() : extractedText.trim()));

      // reset the file input so user can re-upload same file later if needed
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
