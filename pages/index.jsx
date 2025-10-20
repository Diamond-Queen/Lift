//bit.ly/LiftStudy

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import styles from "../styles/Home.module.css";

export default function Home() {
  const [theme, setTheme] = useState("dark");
  const [studyMode, setStudyMode] = useState(true);

  useEffect(() => {
    // read persisted settings
    const t = localStorage.getItem("theme");
    const s = localStorage.getItem("studyMode");
    if (t) setTheme(t);
    if (s) setStudyMode(s === "true");
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("studyMode", studyMode ? "true" : "false");
    // expose study mode globally so CSS can react
    document.documentElement.setAttribute("data-studymode", studyMode ? "true" : "false");
  }, [studyMode]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const handleThemeKeyDown = useCallback((e) => {
    if (e.key === "Enter") toggleTheme();
  }, [toggleTheme]);

  const toggleStudyMode = useCallback(() => {
    setStudyMode((s) => !s);
  }, []);

  const handleStudyKeyDown = useCallback((e) => {
    if (e.key === "Enter") toggleStudyMode();
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

            {/* DARK THEME TOGGLE - ORIGINAL BOOTSTRAP SWITCH */}
            <div 
              className={`${styles.toggleRow} d-flex align-items-center justify-content-between`}
              tabIndex={0}
              role="button"
              onClick={toggleTheme}
              onKeyDown={handleThemeKeyDown}
              aria-label={`Toggle dark theme, currently ${theme === 'dark' ? 'on' : 'off'}`}
            > 
              <div className={styles.toggleLabel}>Dark theme</div>
              <div>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="themeSwitch"
                    checked={theme === 'dark'}
                    onChange={toggleTheme}
                    aria-checked={theme === 'dark'}
                  />
                  <label className="form-check-label sr-only" htmlFor="themeSwitch">Dark theme</label>
                </div>
              </div>
            </div>

            {/* STUDY MODE TOGGLE - ORIGINAL BOOTSTRAP SWITCH */}
            <div 
              className={`${styles.toggleRow} d-flex align-items-center justify-content-between`}
              tabIndex={0}
              role="button"
              onClick={toggleStudyMode}
              onKeyDown={handleStudyKeyDown}
              aria-label={`Toggle study mode, currently ${studyMode ? 'on' : 'off'}`}
            > 
              <div className={styles.toggleLabel}>Study mode</div>
              <div>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="studySwitch"
                    checked={studyMode}
                    onChange={toggleStudyMode}
                    aria-checked={studyMode}
                  />
                  <label className="form-check-label sr-only" htmlFor="studySwitch">Study mode</label>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
