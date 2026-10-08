'use client';
import { useEffect } from 'react';

// Shown if a page crashes, so you can get back to the course instead of a dead end.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="content narrow error-page">
    <h1>Something went wrong on this page</h1>
    <p className="page-subtitle">Your progress is safe. Try again, or go back to the course.</p>
    <div className="button-row">
      <button className="primary" onClick={() => retry()}>Try again</button>
      <button className="secondary" onClick={() => { window.location.hash = 'home'; retry(); }}>Go to Course</button>
    </div>
  </main>;
}
