// pages/Notes.js

import dynamic from 'next/dynamic';

const NotesDynamic = dynamic(() => import('./NotesUI'), {
  ssr: false,
  loading: () => <p>Loading Note Generator...</p>
});

export default function Notes() {
  return <NotesDynamic />;
}