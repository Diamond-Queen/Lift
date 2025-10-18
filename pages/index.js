//bit.ly/LiftStudy

import Link from "next/link";
import styles from "../styles/Home.module.css";

export default function Home() {
  return (
    <main className={styles.root} role="main">
      <div className={styles.hero}>
        <h1 className={styles.title}>Lift</h1>
        <p className={styles.subtitle}>Study smarter. Prepare faster.</p>

        <nav className={styles.actions} aria-label="Primary">
          <Link href="/notes">
            <a className={`${styles.btn} ${styles.primary}`}>Lift Notes</a>
          </Link>
          <Link href="/career">
            <a className={`${styles.btn} ${styles.accent}`}>Lift Career</a>
          </Link>
        </nav>
      </div>
    </main>
  );
}
