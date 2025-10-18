import { useState, useCallback } from "react";
import styles from "../styles/Notes.module.css";

export default function Notes() {
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState("");
  const [quiz, setQuiz] = useState("");

  const handleGenerate = async () => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: input }),
    });
    const data = await res.json();
    setSummary(data.summary);
    setQuiz(data.quiz);
  };

  const handleInputChange = useCallback((e) => setInput(e.target.value), []);

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
        className={`${styles.btnAction} ${styles.btnBlue} hide-when-study`}
        onClick={handleGenerate}
      >
        Generate
      </button>

      {summary && (
        <div className={`${styles.resultCard} hide-when-study`}>
          <h2 className="font-bold mb-2">Summary</h2>
          <p>{summary}</p>
          <h2 className="font-bold mt-4 mb-2">Quiz Questions</h2>
          <p>{quiz}</p>
        </div>
      )}
    </div>
  );
}
