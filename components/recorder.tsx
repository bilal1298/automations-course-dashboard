'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

// Records your spoken answer so you can listen back. Audio stays in this browser tab; nothing is uploaded.
export default function Recorder() {
  const [state, setState] = useState<'idle' | 'recording' | 'done' | 'unavailable'>('idle');
  const [url, setUrl] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  useEffect(() => () => { recorder.current?.stream.getTracks().forEach(t => t.stop()); if (url) URL.revokeObjectURL(url); }, [url]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const r = new MediaRecorder(stream);
      r.ondataavailable = e => chunks.push(e.data);
      r.onstop = () => { stream.getTracks().forEach(t => t.stop()); setUrl(URL.createObjectURL(new Blob(chunks, { type: r.mimeType }))); setState('done'); };
      r.start(); recorder.current = r; setState('recording');
    } catch { setState('unavailable'); }
  };

  if (state === 'unavailable') return <p className="muted recorder-note">Microphone not available. Use your phone’s voice memo app instead.</p>;
  return <div className="recorder">
    {state === 'recording'
      ? <button className="secondary recording" onClick={() => recorder.current?.stop()}><Square size={15} />Stop recording</button>
      : <button className="secondary" onClick={start}><Mic size={15} />{state === 'done' ? 'Record again' : 'Record my answer'}</button>}
    {state === 'done' && url && <audio controls src={url} />}
  </div>;
}
