import { useState, useCallback } from "react";
import styles from "../styles/Notes.module.css";

export default function Notes() {
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!input.trim() && !file) {
      setError("Please add notes or upload a file.");
      return;
    }

    setLoading(true);
    setError("");
    setSummaries([]);
    setFlashcards([]);

    try {
      const formData = new FormData();
      formData.append("notes", input);
      if (file) formData.append("file", file);

      const res = await fetch("/api/notes", { method: "POST", body: formData });
      const data = await res.json();

      if (data.error) setError(data.error);
      else {
        setSummaries(data.summaries);
        setFlashcards(data.flashcards);
      }
    } catch {
      setError("Failed to generate. Try again.");
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

      <input
        type="file"
        accept=".pdf,.pptx"
        onChange={(e) => setFile(e.target.files[0])}
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
                className={`${styles.flashcard} ${card.flipped ? styles.flipped : ""}`}
                onClick={() => toggleFlashcard(i)}
              >
                <div className={styles.front}>{card.question}</div>
                <div className={styles.back}>{card.answer}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
