//bit.ly/LiftStudy

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import styles from "../styles/Home.module.css";

export default function Home() {
  // --- State and Persistence ---
  const [theme, setTheme] = useState("dark");
  const [studyMode, setStudyMode] = useState(true);

  // 1. Initial Load: Read persisted settings from localStorage
  useEffect(() => {
    const t = localStorage.getItem("theme");
    const s = localStorage.getItem("studyMode");
    // NOTE: For a real app, you would use Firestore instead of localStorage for persistence.
    if (t) setTheme(t);
    // localStorage stores true/false as strings
    if (s) setStudyMode(s === "true"); 
  }, []);

  // 2. Theme Change: Apply theme attribute and save to localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // 3. Study Mode Change: Apply attribute and save to localStorage
  useEffect(() => {
    localStorage.setItem("studyMode", studyMode ? "true" : "false");
    // expose study mode globally so CSS can react
    document.documentElement.setAttribute("data-studymode", studyMode ? "true" : "false");
  }, [studyMode]);

  // --- Handlers for Theme Toggle ---
  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  // FIX: Handler for keyboard accessibility (Enter/Space key)
  const handleThemeKeyDown = useCallback((e) => {
    // Also allow Space key for accessibility
    if (e.key === "Enter" || e.key === " ") { 
      e.preventDefault();
      toggleTheme();
    }
  }, [toggleTheme]);

  // --- Handlers for Study Mode Toggle ---
  const toggleStudyMode = useCallback(() => {
    setStudyMode((s) => !s);
  }, []);

  // FIX: Handler for keyboard accessibility (Enter/Space key)
  const handleStudyKeyDown = useCallback((e) => {
    // Also allow Space key for accessibility
    if (e.key === "Enter" || e.key === " ") { 
      e.preventDefault();
      toggleStudyMode();
    }
  }, [toggleStudyMode]);

  return (
    <main className={styles.root} role="main">
      <div className={styles.hero}>
        <div className={styles.heroContainer}>
          <div className={`${styles.heroCard} ${styles.fadeIn}`}>
            <div className={styles.titleWrap}>
              <h1 className={styles.title}>Lift</h1>
              <div className={styles.titleFlourish} aria-hidden="true" />
            </div>
            <p className={styles.subtitle}>Study smarter. Prepare faster.</p>

            <nav className={styles.actions} aria-label="Primary">
                <Link href="/notes" className={`${styles.btn} ${styles.primary}`}>
                  Lift Notes
                </Link>
                <Link href="/career" className={`${styles.btn} ${styles.accent}`}>
                  Lift Career
                </Link>
            </nav>
          </div>

          <aside className={`${styles.heroCard} ${styles.toggles}`} aria-label="Preferences">
            <h3 className={styles.pageTitle || ''}>Preferences</h3>

            {/* DARK THEME TOGGLE - NOW USING CUSTOM CSS SWITCH */}
            <div 
              className={`${styles.toggleRow} flex items-center justify-between`}
              tabIndex={0}
              role="button"
              onClick={toggleTheme}
              onKeyDown={handleThemeKeyDown}
              aria-label={`Toggle dark theme, currently ${theme === 'dark' ? 'on' : 'off'}`}
            > 
              <div className={styles.toggleLabel}>Dark theme</div>
              {/* Custom Switch Markup */}
              <div className={theme === 'dark' ? `${styles.switch} ${styles.switchOn}` : styles.switch}>
                <div className={theme === 'dark' ? `${styles.knob} ${styles.knobOn}` : styles.knob}></div>
              </div>
            </div>

            {/* STUDY MODE TOGGLE - NOW USING CUSTOM CSS SWITCH */}
            <div 
              className={`${styles.toggleRow} flex items-center justify-between`}
              tabIndex={0}
              role="button"
              onClick={toggleStudyMode}
              onKeyDown={handleStudyKeyDown}
              aria-label={`Toggle study mode, currently ${studyMode ? 'on' : 'off'}`}
            > 
              <div className={styles.toggleLabel}>Study mode</div>
              {/* Custom Switch Markup */}
              <div className={studyMode ? `${styles.switch} ${styles.switchOn}` : styles.switch}>
                <div className={studyMode ? `${styles.knob} ${styles.knobOn}` : styles.knob}></div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
