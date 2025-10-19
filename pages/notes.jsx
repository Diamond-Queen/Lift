"use client";

import { useState } from "react";
import JSZip from "jszip";
import styles from "../styles/Notes.module.css";

export default function Notes() {
  const [input, setInput] = useState("");
  const [summaries, setSummaries] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔹 Extract text from PPTX client-side
  const extractTextFromPptx = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
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

  // 🔹 Handle file upload
  const handleFileChange = async (e) => {
    setError("");
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      if (file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
        const pptxText = await extractTextFromPptx(file);
        setInput((prev) => prev + "\n" + pptxText);
      } else if (file.type === "application/pdf") {
        setError("PDF upload not supported. Please copy-paste the text.");
      } else {
        setError("Unsupported file type.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to extract text from file.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Generate summaries + flashcards
  const handleGenerate = async () => {
    if (!input.trim()) {
      setError("Please add notes or upload a PPTX file.");
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
        setFlashcards(data.flashcards || []);
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
        placeholder="Paste your notes here or upload a PPTX file..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <input
        type="file"
        accept=".pptx"
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
