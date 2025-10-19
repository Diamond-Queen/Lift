import { useState } from "react";
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
      let res, data;

      if (file) {
        // Use FormData for file uploads
        const formData = new FormData();
        if (input.trim()) formData.append("notes", input);
        formData.append("file", file);

        res = await fetch("/api/notes", {
          method: "POST",
          body: formData,
        });
        data = await res.json();
      } else {
        // JSON request for typed notes
        res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: input }),
        });
        data = await res.json();
      }

      if (data.error) setError(data.error);
      else {
        setSummaries(data.summaries);
        setFlashcards(data.flashcards);
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
        className={`${styles.btnAction} ${styles.btnBlue} ${loading ? styles.loading : ""}`}
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
            <p key={i} className={styles.summaryBlock}>{sum}</p>
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
