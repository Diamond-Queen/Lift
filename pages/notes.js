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
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Lift Notes</h1>
      <textarea
        className="w-full border rounded p-3 mb-4"
        rows={8}
        placeholder="Paste your notes here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={handleGenerate}
      >
        Generate
      </button>

      {summary && (
        <div className="mt-6 p-4 border rounded bg-gray-50 text-black">
          <h2 className="font-bold mb-2">Summary</h2>
          <p>{summary}</p>
          <h2 className="font-bold mt-4 mb-2">Quiz Questions</h2>
          <p>{quiz}</p>
        </div>
      )}
    </div>
  );
}
