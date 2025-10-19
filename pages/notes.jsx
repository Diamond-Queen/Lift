"use client";

import { useState } from "react";
import styles from "../styles/Notes.module.css";

export default function Notes() {
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState("");
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!input.trim()) {
      setError("Please add notes first.");
      return;
    }

    setLoading(true);
    setError("");
    setSummary("");
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
        setSummary(data.summary || "");
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
      prev.map((c, i) =>
        i === index ? { ...c, flipped: !c.flipped } : c
      )
    );
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Lift Notes</h1>

      <textarea
        className={styles.textarea}
        rows={6}
        placeholder="Paste your notes here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        className={`${styles.btnAction} ${loading ? styles.loading : ""}`}
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? "Generating…" : "Generate"}
      </button>

      {error && <div className={styles.error}>{error}</div>}

      {summary && (
        <div className={styles.resultCard}>
          <h2 className={styles.resultTitle}>Summary</h2>
          <p>{summary}</p>
        </div>
      )}

      {flashcards.length > 0 && (
        <div className={styles.resultCard}>
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
