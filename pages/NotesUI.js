"use client";

import { useState } from "react";
import JSZip from "jszip";
// REMOVED: pdfjs-dist top-level import (handled dynamically)

// Assuming your CSS path is correct now
import styles from "../styles/Notes.module.css"; 


export default function NotesUI() {
  const [input, setInput] = useState("");
  const [summaries, setSummaries] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  //  ✅ PPTX Processor (Uses JSZip)
  const extractTextFromPptx = async (fileBuffer) => {
    const zip = await JSZip.loadAsync(fileBuffer);
    let text = "";

    const slideFiles = Object.keys(zip.files).filter((f) =>
      f.match(/^ppt\/slides\/slide\d+\.xml$/)
    );

    for (const slidePath of slideFiles) {
      const slideXml = await zip.files[slidePath].async("text");
      const matches = [...slideXml.matchAll(/<a:t>(.*?)<\/a:t>/g)];
      matches.forEach((m) => (text += m[1] + "\n"));
    }

    return text.trim();
  };

  //  ✅ PDF Processor (Uses dynamic pdfjs-dist import)
  const extractTextFromPdf = async (file) => {
    // 1. Dynamic Import: Safe because it runs only after user interaction
    const pdfjsLib = await import("pdfjs-dist/build/pdf");
    
    // 2. Set Worker Source: Required for pdfjs-dist to work
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      const pageText = content.items
        .map((item) => item.str)
        .join(" ");

      text += pageText + "\n\n";
    }

    return text.trim();
  };

  //  ✅ Handle file uploads
  const handleFileChange = async (e) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      let extractedText = "";

      if (file.name.toLowerCase().endsWith(".pptx")) {
        const buffer = await file.arrayBuffer();
        extractedText = await extractTextFromPptx(buffer);
      } else if (file.name.toLowerCase().endsWith(".pdf")) {
        // Calls the new, robust PDF extraction function
        extractedText = await extractTextFromPdf(file);
      } else {
        throw new Error("Unsupported file type. Use PDF or PPTX.");
      }

      if (!extractedText.trim()) throw new Error("No readable text found.");

      setInput((prev) =>
        prev ? prev.trim() + "\n\n" + extractedText.trim() : extractedText.trim()
      );
      e.target.value = ""; // allow re-upload
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to extract text. File might be protected or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  //  Generate summaries + flashcards (Logic remains unchanged)
  const handleGenerate = async () => {
    if (!input.trim()) {
      // Updated error to include files again
      setError("Please add notes or upload a file first."); 
      return;
    }

    setLoading(true);
    setError("");
    setSummaries([]);
    setFlashcards([]);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: input }),
      });

      const data = await res.json();

      if (!res.ok) { 
        setError(data.error || "An unknown error occurred during generation.");
      } else {
        setSummaries(data.summaries || []);
        const newFlashcards = (data.flashcards || [])
          .slice(0, 12) 
          .map((q) => ({ ...q, flipped: false })); 
        
        setFlashcards(newFlashcards);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate. Please try again.");
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
        placeholder="Paste your notes here or upload a file..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      {/*  ADDED: File Input and Generate Button Row */}
      <div className={styles.fileGenerateRow}>
        <label htmlFor="file-upload" className={styles.fileButton}>
          Upload File (.pdf, .pptx)
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".pdf, .pptx"
          onChange={handleFileChange}
          className={styles.hiddenFileInput}
        />

        <button
          className={`${styles.generateButton} ${loading ? styles.loading : ""}`}
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Results rendering remains the same */}
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
          <div className={styles.flashcardsScroll}>
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