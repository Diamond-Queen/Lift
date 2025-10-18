import { useState, useCallback } from "react";
import styles from "../styles/Career.module.css";

export default function Career() {
  const [name, setName] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [type, setType] = useState("resume");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setError("");
    setResult("");
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, experience, skills, type }),
      });

      if (!res.ok) throw new Error("Network response was not ok");

      const data = await res.json();
      setResult(data.result || data.output || "No output returned.");
    } catch (err) {
      console.error(err);
      setError("Failed to generate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Lift Career</h1>

      <input
        type="text"
        placeholder="Name"
        className={styles.input}
        value={name}
        onChange={useCallback((e) => setName(e.target.value), [])}
        disabled={loading}
      />

      <textarea
        placeholder="Experience"
        className={styles.textarea}
        rows={3}
        value={experience}
        onChange={useCallback((e) => setExperience(e.target.value), [])}
        disabled={loading}
      />

      <textarea
        placeholder="Skills"
        className={styles.textarea}
        rows={3}
        value={skills}
        onChange={useCallback((e) => setSkills(e.target.value), [])}
        disabled={loading}
      />

      <select
        className={styles.input}
        value={type}
        onChange={useCallback((e) => setType(e.target.value), [])}
        disabled={loading}
      >
        <option value="resume">Resume</option>
        <option value="cover">Cover Letter</option>
      </select>

      <button
        className={`${styles.btnAction} ${styles.btnPurple} ${
          loading ? styles.loading : ""
        }`}
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? "Generating…" : "Generate"}
      </button>

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <div className={styles.resultCard}>
          <h2 className={styles.resultTitle}>Result</h2>
          <pre className={styles.resultContent}>{result}</pre>
        </div>
      )}
    </div>
  );
}
