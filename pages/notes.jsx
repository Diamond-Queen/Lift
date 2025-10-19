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

  //Handle file upload (PPTX/PDF extraction simplified for testing)
  
      const handleFileChange = async (e) => {
        setError("");
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
          let extractedText = "";

          // Identify file type
          if (
            file.type ===
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
          ) {
            const arrayBuffer = await file.arrayBuffer();
            extractedText = await extractTextFromPptx(arrayBuffer);
          } else if (file.type === "application/pdf") {
            extractedText = await extractTextFromPdf(file);
          } else {
            throw new Error("Unsupported file type.");
          }

          // Only add extracted content — not the file path
          if (extractedText.trim()) {
            setInput((prev) => prev.trim() + "\n\n" + extractedText.trim());
          } else {
            throw new Error("No readable text found in file.");
          }

          // Clear file input value so same file can be reuploaded later
          e.target.value = "";
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
        setFlashcards(data.flashcards || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate. Try again.");
    } finally {
      setLoading(false);
    }
  };

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
        placeholder="Paste your notes here or upload a file..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <div className={styles.fileGenerateRow}>
        <label className={styles.fileButton}>
          Browse Files
          <input type="file" accept=".pdf,.pptx" onChange={handleFileChange} hidden />
        </label>

        <button
          className={`${styles.generateButton} ${loading ? styles.loading : ""}`}
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

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
