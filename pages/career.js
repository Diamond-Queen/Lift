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
      const data = await res.json();
      setResult(data.result || "");
    } catch (err) {
      setError("Failed to generate. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = useCallback((e) => setName(e.target.value), []);
  const handleExperienceChange = useCallback((e) => setExperience(e.target.value), []);
  const handleSkillsChange = useCallback((e) => setSkills(e.target.value), []);
  const handleTypeChange = useCallback((e) => setType(e.target.value), []);

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Lift Career</h1>
      <input
        type="text"
        placeholder="Name"
        className={styles.input}
        value={name}
        onChange={handleNameChange}
        disabled={loading}
      />
      <textarea
        placeholder="Experience"
        className={styles.textarea}
        rows={3}
        value={experience}
        onChange={handleExperienceChange}
        disabled={loading}
      />
      <textarea
        placeholder="Skills"
        className={styles.textarea}
        rows={3}
        value={skills}
        onChange={handleSkillsChange}
        disabled={loading}
      />
      <select
        className={styles.input}
        value={type}
        onChange={handleTypeChange}
        disabled={loading}
      >
        <option value="resume">Resume</option>
  <option value="cover">Cover Letter</option>
      </select>
      <button
        className={`${styles.btnAction} ${styles.btnPurple} ${loading ? styles.loading : ''}`}
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? 'Generating…' : 'Generate'}
      </button>

      {error && <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}

      {result && (
        <div className={`${styles.resultCard} hide-when-study`}>
          <h2 className="font-bold mb-2">Result</h2>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}
