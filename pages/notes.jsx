"use client";

import { useState } from "react";
import JSZip from "jszip";
import styles from "../styles/Notes.module.css";
// NOTE: NO top-level import of pdfjs-dist here.

export default function Notes() {
  // ... (state and extractTextFromPptx remains unchanged)

  // FIX: Make this an internal, dynamically imported function
  const extractTextFromPdf = async (file) => {
    // 1. Dynamic Import: This code only runs when the button is clicked (on the client).
    const pdfjsLib = await import("pdfjs-dist/build/pdf");
    
    // 2. Set Worker Source: Must be set AFTER the library is loaded.
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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

  //  Handle file uploads
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
        // Now calls the fixed PDF extraction function
        extractedText = await extractTextFromPdf(file);
      } else {
        throw new Error("Unsupported file type. Use PDF or PPTX.");
      }
      // ... (rest of handleFileChange)
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to extract text. File might be protected or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  // ... (rest of component: handleGenerate, toggleFlashcard, return JSX)
}