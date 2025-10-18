import { useState } from "react";

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

  return (
    <div className="container">
      <h1 className="page-title">Lift Notes</h1>
      <textarea
        className="textarea"
        rows={8}
        placeholder="Paste your notes here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        className="btn-action btn-blue"
        onClick={handleGenerate}
      >
        Generate
      </button>

      {summary && (
        <div className="result-card">
          <h2 className="font-bold mb-2">Summary</h2>
          <p>{summary}</p>
          <h2 className="font-bold mt-4 mb-2">Quiz Questions</h2>
          <p>{quiz}</p>
        </div>
      )}
    </div>
  );
}
