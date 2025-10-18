import { useState, useCallback } from "react";
import styles from "../styles/Career.module.css";

export default function Career() {
  const [type, setType] = useState("resume");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Common fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Resume-specific
  const [address, setAddress] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [objective, setObjective] = useState("");
  const [experience, setExperience] = useState("");
  const [education, setEducation] = useState("");
  const [skills, setSkills] = useState("");
  const [certifications, setCertifications] = useState("");

  // Cover letter-specific
  const [recipient, setRecipient] = useState("");
  const [position, setPosition] = useState("");
  const [paragraphs, setParagraphs] = useState("");

  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    setError("");
    setResult(null);

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Name, email, and phone are required.");
      return;
    }

    setLoading(true);

    try {
      const bodyData = {
        type,
        name,
        email,
        phone,
        ...(type === "resume" && {
          address, linkedin, objective, experience, education, skills, certifications
        }),
        ...(type === "cover" && {
          recipient, position, paragraphs
        }),
      };

      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) throw new Error("Network response not ok");

      const data = await res.json();
      setResult(data.result || {});
    } catch (err) {
      console.error(err);
      setError("Failed to generate. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Lift Career Generator</h1>

      <select
        className={styles.input}
        value={type}
        onChange={useCallback((e) => setType(e.target.value), [])}
        disabled={loading}
      >
        <option value="resume">Resume</option>
        <option value="cover">Cover Letter</option>
      </select>

      {/* Common fields */}
      <input type="text" placeholder="Full Name" className={styles.input} value={name} onChange={useCallback((e)=>setName(e.target.value), [])} disabled={loading} />
      <input type="email" placeholder="Email" className={styles.input} value={email} onChange={useCallback((e)=>setEmail(e.target.value), [])} disabled={loading} />
      <input type="text" placeholder="Phone" className={styles.input} value={phone} onChange={useCallback((e)=>setPhone(e.target.value), [])} disabled={loading} />

      {type === "resume" && (
        <>
          <input type="text" placeholder="Address" className={styles.input} value={address} onChange={useCallback((e)=>setAddress(e.target.value), [])} disabled={loading} />
          <input type="text" placeholder="LinkedIn / Portfolio" className={styles.input} value={linkedin} onChange={useCallback((e)=>setLinkedin(e.target.value), [])} disabled={loading} />
          <textarea placeholder="Objective / Summary" className={styles.textarea} value={objective} onChange={useCallback((e)=>setObjective(e.target.value), [])} rows={3} disabled={loading} />
          <textarea placeholder="Experience (one per line: Title, Company, Dates, Details)" className={styles.textarea} value={experience} onChange={useCallback((e)=>setExperience(e.target.value), [])} rows={4} disabled={loading} />
          <textarea placeholder="Education (one per line: Degree, School, Dates)" className={styles.textarea} value={education} onChange={useCallback((e)=>setEducation(e.target.value), [])} rows={3} disabled={loading} />
          <textarea placeholder="Skills (comma separated)" className={styles.textarea} value={skills} onChange={useCallback((e)=>setSkills(e.target.value), [])} rows={2} disabled={loading} />
          <textarea placeholder="Certifications (comma separated)" className={styles.textarea} value={certifications} onChange={useCallback((e)=>setCertifications(e.target.value), [])} rows={2} disabled={loading} />
        </>
      )}

      {type === "cover" && (
        <>
          <input type="text" placeholder="Recipient Name / Company" className={styles.input} value={recipient} onChange={useCallback((e)=>setRecipient(e.target.value), [])} disabled={loading} />
          <input type="text" placeholder="Position Applied For" className={styles.input} value={position} onChange={useCallback((e)=>setPosition(e.target.value), [])} disabled={loading} />
          <textarea placeholder="Cover Letter Paragraphs (1-3)" className={styles.textarea} value={paragraphs} onChange={useCallback((e)=>setParagraphs(e.target.value), [])} rows={6} disabled={loading} />
        </>
      )}

      <button className={`${styles.btnAction} ${styles.btnPurple} ${loading ? styles.loading : ""}`} onClick={handleGenerate} disabled={loading}>
        {loading ? "Generating…" : "Generate"}
      </button>

      {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}

      {result && (
        <div className={styles.resultCard}>
          {type === "resume" && result.name && (
            <div className={styles.printableResume}>
              <h1>{result.name}</h1>
              <p>{result.email} | {result.phone}{result.address && ` | ${result.address}`}</p>
              {result.linkedin && <p>LinkedIn / Portfolio: {result.linkedin}</p>}
              {result.objective && <p><strong>Objective:</strong> {result.objective}</p>}

              {result.experience?.length > 0 && (
                <>
                  <h2>Experience</h2>
                  {result.experience.map((job, i) => (
                    <div key={i}>
                      <strong>{job.title}</strong> — {job.company} ({job.dates})
                      <p>{job.details}</p>
                    </div>
                  ))}
                </>
              )}

              {result.education?.length > 0 && (
                <>
                  <h2>Education</h2>
                  {result.education.map((edu, i) => (
                    <div key={i}>
                      <strong>{edu.degree}</strong> — {edu.school} ({edu.dates})
                    </div>
                  ))}
                </>
              )}

              {result.skills?.length > 0 && (
                <>
                  <h2>Skills</h2>
                  <p>{result.skills.join(", ")}</p>
                </>
              )}

              {result.certifications?.length > 0 && (
                <>
                  <h2>Certifications</h2>
                  <p>{result.certifications.join(", ")}</p>
                </>
              )}
            </div>
          )}

          {type === "cover" && result.name && (
            <div className={styles.printableCover}>
              <p>{new Date().toLocaleDateString()}</p>
              <p>{recipient || result.recipient}</p>
              <p>Dear {recipient || result.recipient},</p>
              <p>{paragraphs || result.paragraphs}</p>
              <p>Sincerely,</p>
              <p>{name || result.name}</p>
            </div>
          )}

          <button className={styles.printBtn} onClick={() => window.print()}>
            Print {type === "resume" ? "Resume" : "Cover Letter"}
          </button>
        </div>
      )}
    </div>
  );
}
