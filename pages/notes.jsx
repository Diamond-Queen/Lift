"use client";

import { useState, useRef } from "react";
import JSZip from "jszip";
import styles from "../styles/Notes.module.css";

export default function Notes() {
  const [input, setInput] = useState("");
  const [flashcards, setFlashcards] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sliderRef = useRef(null);

  // 🔹 Handle file upload (simplified for now)
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text(); // fallback for testing
      setInput((prev) => prev + "\n" + text);
    } catch (err) {
      console.error(err);
      setError("Failed to read file.");
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

  // 🔹 Flashcard flip toggle
  const toggleFlashcard = (index) => {
    setFlashcards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, flipped: !card.flipped } : card
      )
    );
  };

  // 🔹 Slider controls
  const slideLeft = () => {
    if (sliderRef.current) sliderRef.current.scrollBy({ left: -220, behavior: "smooth" });
  };
  const slideRight = () => {
    if (sliderRef.current) sliderRef.current.scrollBy({ left: 220, behavior: "smooth" });
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
          <div className={styles.sliderWrapper}>
            <button className={styles.arrowLeft} onClick={slideLeft}>&lt;</button>
            <div className={styles.flashcardsSlider} ref={sliderRef}>
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
            <button className={styles.arrowRight} onClick={slideRight}>&gt;</button>
          </div>
        </div>
      )}
    </div>
  );
}
