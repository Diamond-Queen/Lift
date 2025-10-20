"use client";

import { useState, useEffect } from "react";
import JSZip from "jszip";
import styles from "../styles/Notes.module.css"; 


export default function NotesUI() {
  const [input, setInput] = useState("");
  const [summaries, setSummaries] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  //  NEW STATE: Tracks the index of the currently visible (top) card
  const [activeCardIndex, setActiveCardIndex] = useState(0); 

  // Reset active index when new flashcards are generated
  useEffect(() => {
    if (flashcards.length > 0) {
      setActiveCardIndex(0);
    }
  }, [flashcards]);

  // --- File Processors ---
  
  // PPTX Processor (unchanged)
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

  // PDF Processor (unchanged, uses .mjs path)
  const extractTextFromPdf = async (file) => {
    const pdfjsLib = await import("pdfjs-dist/build/pdf");
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(" ");
      text += pageText + "\n\n";
    }
    return text.trim();
  };

  // --- Handlers ---
  
  const handleFileChange = async (e) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      let extractedText = "";
      if (file.name.toLowerCase().endsWith(".pptx")) {
        extractedText = await extractTextFromPptx(await file.arrayBuffer());
      } else if (file.name.toLowerCase().endsWith(".pdf")) {
        extractedText = await extractTextFromPdf(file);
      } else {
        throw new Error("Unsupported file type. Use PDF or PPTX.");
      }

      if (!extractedText.trim()) throw new Error("No readable text found.");

      setInput((prev) =>
        prev ? prev.trim() + "\n\n" + extractedText.trim() : extractedText.trim()
      );
      e.target.value = "";
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to extract text. File might be protected or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!input.trim()) {
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
  
  //  Modified to only flip the active card
  const toggleFlashcard = (index) => {
    if (index === activeCardIndex) {
      setFlashcards((prev) =>
        prev.map((card, i) => (i === index ? { ...card, flipped: !card.flipped } : card))
      );
    }
  };

  // NEW: Logic for 'Next' button
  const handleNextCard = () => {
    if (activeCardIndex < flashcards.length - 1) {
      setActiveCardIndex(prev => prev + 1);
    }
  };

  //  NEW: Logic for 'Prev' button
  const handlePrevCard = () => {
    if (activeCardIndex > 0) {
      setActiveCardIndex(prev => prev - 1);
    }
  };

  // --- Rendering ---
  
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

      {/* Summaries rendering remains the same */}
      {summaries.length > 0 && (
        <div className={styles.resultCard}>
          <h2 className={styles.resultTitle}>Summaries</h2>
          {summaries.map((sum, i) => (
            <p key={i}>{sum}</p>
          ))}
        </div>
      )}

      {/* Flashcards Rendering (Stacked) */}
      {flashcards.length > 0 && (
        <div className={styles.flashcardsContainer}>
          <h2 className={styles.resultTitle}>Flashcards</h2>
          
          <div className={styles.flashcardsStackWrapper}>
            {/* Map the cards in reverse order to ensure the lowest index is visually on top initially */}
            {flashcards.slice().reverse().map((card, i, arr) => {
              
              const originalIndex = flashcards.length - 1 - i;
              let cardClass = styles.flashcard;
              
              if (originalIndex < activeCardIndex) {
                // Cards already "swiped" away (moved off-screen)
                cardClass += ` ${styles.removed}`;
              } else if (originalIndex === activeCardIndex) {
                // The current active card (highest visibility)
                cardClass += card.flipped ? ` ${styles.flipped}` : '';
              } else if (originalIndex === activeCardIndex + 1) {
                // The card immediately behind (small offset)
                cardClass += ` ${styles.nextCard}`;
              } else if (originalIndex === activeCardIndex + 2) {
                // The card two places back (smaller offset)
                cardClass += ` ${styles.nextNextCard}`;
              }

              return (
                <div
                  key={originalIndex}
                  className={cardClass}
                  onClick={() => toggleFlashcard(originalIndex)}
                  style={{ zIndex: originalIndex + 10 }} // Controls layer order
                >
                  <div className={styles.front}>
                    <p>{card.question}</p>
                  </div>
                  <div className={styles.back}>
                    <p>{card.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Navigation Controls */}
          <div className={styles.flashcardControls}>
              <button 
                className={styles.controlButton}
                onClick={handlePrevCard}
                disabled={activeCardIndex === 0}
              >
                {"< Prev"}
              </button>
              <button 
                className={styles.controlButton}
                onClick={handleNextCard}
                disabled={activeCardIndex === flashcards.length - 1}
              >
                {"Next >"}
              </button>
          </div>
        </div>
      )}
    </div>
  );
}