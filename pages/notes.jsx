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

  // 🔹 Extract text from PPTX
  const extractTextFromPptx = async (arrayBuffer) => {
    const zip = await JSZip.loadAsync(arrayBuffer);
    let text = "";

    const slideFiles = Object.keys(zip.files).filter((f) =>
      f.match(/^ppt\/slides\/slide\d+\.xml$/)
    );

    for (const slidePath of slideFiles) {
      const slideXml = await zip.files[slidePath].async("text");
      const matches = [...slideXml.matchAll(/<a:t>(.*?)<\/a:t>/g)];
      matches.forEach((m) => (text += m[1] + "\n"));
    }

    return text;
  };

  // 🔹 Extract text from PDF (simple text extraction, browser-only)
  const extractTextFromPdf = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let text = "";
    // naive string extraction
    const chunk = String.fromCharCode.apply(null, uint8);
    text = chunk.replace(/\s+/g, " ");
    return text;
  };

  // 🔹 Handle file upload
  const handleFileChange = async (e) => {
    setError("");
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      let extractedText = "";

      if (file.name.endsWith(".pptx")) {
        const arrayBuffer = await file.arrayBuffer();
        extractedText = await extractTextFromPptx(arrayBuffer);
      } else if (file.name.endsWith(".pdf")) {
        extractedText = await extractTextFromPdf(file);
      } else {
        throw new Error("Unsupported file type.");
      }

      if (extractedText.trim()) {
        setInput((prev) => prev + "\n" + extractedText);
      } else {
        throw new Error("No readable text found in file.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to extract text.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Generate summaries + flashcards
  const handleGenerate = async () => {
    if (!input.trim()) {
      setError("Please add notes or upload a file first.");
      return;
    }

    setLoading(true);
    setError("");
    setSummaries([]);
    setFlashcards([]);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: input }),
      });

      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setSummaries(data.summaries || []);
        // Limit flashcards to 12
        setFlashcards((data.flashcards || []).slice(0, 12).map((fc) => ({
          ...fc,
          flipped: false
        })));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Flashcard flip toggle
  const toggleFlashcard = (index) => {
    setFlashcards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, flipped: !card.flipped } : card
      )
    );
  };

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

      <input
        type="file"
        accept=".pdf, .pptx"
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

      {error && <div className={styles.error}>{error}</div>}

      {summaries.length > 0 && (
        <div className={styles.resultCard}>
          <h2 className={styles.resultTitle}>Summaries</h2>
          {summaries.map((sum, i) => (
            <p key={i}>{sum}</p>
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
                className={`${styles.flashcard} ${
                  card.flipped ? styles.flipped : ""
                }`}
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
