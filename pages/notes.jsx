import { useState, useCallback } from "react";
import styles from "../styles/Notes.module.css";

export default function Notes() {
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState("");
  const [quiz, setQuiz] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!input.trim()) {
      setError("Please add some notes first.");
      return;
    }

    setLoading(true);
    setError("");
    setSummary("");
    setQuiz([]);

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
        setSummary(data.summary);
        setQuiz(
          data.quiz.map((q) => ({ ...q, flipped: false })) // add flip state
        );
      }
    } catch (err) {
      setError("Failed to generate. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = useCallback((e) => setInput(e.target.value), []);

  const toggleFlashcard = (index) => {
    setQuiz((prev) =>
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
        rows={8}
        placeholder="Paste your notes here..."
        value={input}
        onChange={handleInputChange}
      />

      <button
        className={`${styles.btnAction} ${styles.btnBlue} ${loading ? styles.loading : ""}`}
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

      {quiz.length > 0 && (
        <div className={styles.flashcardsContainer}>
          <h2 className={styles.resultTitle}>Flashcards</h2>
          <div className={styles.flashcardsGrid}>
            {quiz.map((card, i) => (
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
