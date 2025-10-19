"use client";

import { useState } from "react";
// REMOVED: JSZip (since PPTX is removed)
// REMOVED: pdfjs-dist (since PDF is removed)

// Assuming your CSS path is now correct:
import styles from "../styles/Notes.module.css"; 


export default function NotesUI() {
  const [input, setInput] = useState("");
  const [summaries, setSummaries] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // REMOVED: extractTextFromPptx (temporarily)
  // REMOVED: extractTextFromPdf (temporarily)

  // REMOVED: handleFileChange (temporarily)


  //  Generate summaries + flashcards (API call remains the core logic)
  const handleGenerate = async () => {
    if (!input.trim()) {
      setError("Please add notes first.");
      return;
    }

    setLoading(true);
    setError("");
    setSummaries([]);
    setFlashcards([]);
    try {
      // API Path Check: Must be correct for your setup
      const res = await fetch("/api/notes", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: input }),
      });

      const data = await res.json();

      if (!res.ok) { 
        setError(data.error || "An unknown error occurred during generation.");
      } else {
        setSummaries(data.summaries || []);
        const newFlashcards = (data.flashcards || [])
          .slice(0, 12) 
          .map((q) => ({ ...q, flipped: false })); 
        
        setFlashcards(newFlashcards);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFlashcard = (index) => {
    setFlashcards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, flipped: !card.flipped } : card))
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

      {/* REMOVED: File Input (temporarily) */}

      <button
        // Use the CSS class that exists for the button
        className={`${styles.generateButton} ${loading ? styles.loading : ""}`} 
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? "Generating…" : "Generate"}
      </button>

      {error && <div className={styles.error}>{error}</div>}

      {/* Results rendering remains the same */}
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