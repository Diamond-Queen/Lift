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
      // parse textarea inputs for structured display
      const parsedExperience = experience
        .split("\n")
        .map(line => {
          const [title, company, dates, details] = line.split("|").map(s => s?.trim() || "");
          return { title, company, dates, details };
        })
        .filter(e => e.title);

      const parsedEducation = education
        .split("\n")
        .map(line => {
          const [degree, school, dates] = line.split("|").map(s => s?.trim() || "");
          return { degree, school, dates };
        })
        .filter(e => e.degree);

      const parsedSkills = skills.split(",").map(s => s.trim()).filter(Boolean);
      const parsedCerts = certifications.split(",").map(s => s.trim()).filter(Boolean);

      const bodyData = {
        type,
        name,
        email,
        phone,
        ...(type === "resume" && {
          address,
          linkedin,
          objective,
          experience: parsedExperience,
          education: parsedEducation,
          skills: parsedSkills,
          certifications: parsedCerts
        }),
        ...(type === "cover" && { recipient, position, paragraphs })
      };

      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
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

  const handleChange = setter => e => setter(e.target.value);

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Lift Career Generator</h1>

      <select className={styles.input} value={type} onChange={handleChange(setType)} disabled={loading}>
        <option value="resume">Resume</option>
        <option value="cover">Cover Letter</option>
      </select>

      {/* Common Fields */}
      <input type="text" placeholder="Full Name" className={styles.input} value={name} onChange={handleChange(setName)} disabled={loading} />
      <input type="email" placeholder="Email" className={styles.input} value={email} onChange={handleChange(setEmail)} disabled={loading} />
      <input type="text" placeholder="Phone" className={styles.input} value={phone} onChange={handleChange(setPhone)} disabled={loading} />

      {/* Resume Fields */}
      {type === "resume" && (
        <>
          <input type="text" placeholder="Address" className={styles.input} value={address} onChange={handleChange(setAddress)} disabled={loading} />
          <input type="text" placeholder="LinkedIn / Portfolio" className={styles.input} value={linkedin} onChange={handleChange(setLinkedin)} disabled={loading} />
          <textarea placeholder="Objective / Summary" className={styles.textarea} value={objective} onChange={handleChange(setObjective)} rows={3} disabled={loading} />
          <textarea placeholder="Experience (Title | Company | Dates | Details per line)" className={styles.textarea} value={experience} onChange={handleChange(setExperience)} rows={4} disabled={loading} />
          <textarea placeholder="Education (Degree | School | Dates per line)" className={styles.textarea} value={education} onChange={handleChange(setEducation)} rows={3} disabled={loading} />
          <textarea placeholder="Skills (comma separated)" className={styles.textarea} value={skills} onChange={handleChange(setSkills)} rows={2} disabled={loading} />
          <textarea placeholder="Certifications (comma separated)" className={styles.textarea} value={certifications} onChange={handleChange(setCertifications)} rows={2} disabled={loading} />
        </>
      )}

      {/* Cover Letter Fields */}
      {type === "cover" && (
        <>
          <input type="text" placeholder="Recipient Name / Company" className={styles.input} value={recipient} onChange={handleChange(setRecipient)} disabled={loading} />
          <input type="text" placeholder="Position Applied For" className={styles.input} value={position} onChange={handleChange(setPosition)} disabled={loading} />
          <textarea placeholder="Cover Letter Paragraphs (1-3)" className={styles.textarea} value={paragraphs} onChange={handleChange(setParagraphs)} rows={6} disabled={loading} />
        </>
      )}

      <button className={`${styles.btnAction} ${styles.btnPurple} ${loading ? styles.loading : ""}`} onClick={handleGenerate} disabled={loading}>
        {loading ? "Generating…" : "Generate"}
      </button>

      {error && <div className={styles.error}>{error}</div>}

      {/* Display Result */}
      {result && (
        <div className={styles.resultCard}>
          {type === "resume" && result.name && (
            <div className={styles.printableResume}>
              <h1>{result.name}</h1>
              <p className={styles.contact}>{result.email} | {result.phone}{result.address && ` | ${result.address}`}</p>
              {result.linkedin && <p>LinkedIn / Portfolio: {result.linkedin}</p>}
              {result.objective && <p><strong>Objective:</strong> {result.objective}</p>}

              {result.experience?.length > 0 && (
                <>
                  <h2>Experience</h2>
                  {result.experience.map((job, i) => (
                    <div key={i} className={styles.sectionItem}>
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
                    <div key={i} className={styles.sectionItem}>
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

          {type === "cover" && result && (
            <div className={styles.printableCover}>
              <div className={styles.letterhead}>
                <h1 className={styles.letterName}>{result.name}</h1>
                {result.email && <p>{result.email}</p>}
                {result.phone && <p>{result.phone}</p>}
                {result.address && <p>{result.address}</p>}
              </div>

              <div className={styles.letterBody}>
                <p className={styles.date}>{new Date().toLocaleDateString()}</p>

                {result.recipient && <p className={styles.recipient}>{result.recipient}</p>}

                <p>Dear {result.recipient || "Hiring Manager"},</p>

                {result.paragraphs && result.paragraphs.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}

                <p>Sincerely,</p>
                <p><strong>{result.name}</strong></p>
              </div>
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
