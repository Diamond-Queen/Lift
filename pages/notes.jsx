"use client";

import { useState } from "react";
import JSZip from "jszip";
import styles from "../styles/Notes.module.css";

// PDF.js will only load in the browser
let pdfjsLib;
if (typeof window !== "undefined") {
  pdfjsLib = require("pdfjs-dist/legacy/build/pdf");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export default function Notes() {
  const [input, setInput] = useState("");
  const [flashcards, setFlashcards] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔹 PDF text extraction
  const extractTextFromPdf = async (file) => {
    if (!pdfjsLib) throw new Error("PDF.js not loaded in browser");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + "\n";
    }
    return text;
  };

  // 🔹 PPTX text extraction
  const extractTextFromPptx = async (file) => {
    const zip = await JSZip.loadAsync(file);
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

  // 🔹 Handle file upload
  const handleFileChange = async (e) => {
    setError("");
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      let extractedText = "";

      if (file.type === "application/pdf") {
        extractedText = await extractTextFromPdf(file);
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      ) {
        extractedText = await extractTextFromPptx(file);
      } else {
        throw new Error("Unsupported file type");
      }

      if (!extractedText.trim()) throw new Error("No readable text found in file.");

      setInput((prev) => prev + "\n" + extractedText);
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
        // Ensure each flashcard has a flipped property
        setFlashcards(
          (data.flashcards || []).map((f) => ({ ...f, flipped: false }))
        );
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
          <div className={styles.flashcardsGrid}>
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
