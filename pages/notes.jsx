// NOTE: We don't need "use client" here if we only import `next/dynamic`
import dynamic from 'next/dynamic';

// 1. Dynamically load the NotesUI component
// 2. Set ssr: false to prevent Next.js from running it on the server
const NotesDynamic = dynamic(() => import('../pages/NotesUI'), {
  ssr: false,
  loading: () => <p>Loading Note Generator...</p>
});

// This is your default export which will be used by the Next.js router
export default function Notes() {
  return <NotesDynamic />;
}