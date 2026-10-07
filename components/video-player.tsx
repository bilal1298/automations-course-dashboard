'use client';
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, RotateCw, PlayCircle } from 'lucide-react';
type Player = {destroy:()=>void};
type YTApi = {Player: new (el: HTMLIFrameElement, config: {events:{onReady:()=>void; onError:(event:{data:number})=>void}}) => Player};
declare global { interface Window { YT?: YTApi; onYouTubeIframeAPIReady?:()=>void; } }
let apiPromise: Promise<YTApi> | null = null;
function api(): Promise<YTApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    window.onYouTubeIframeAPIReady = () => window.YT && resolve(window.YT);
    script.onerror = () => { apiPromise = null; script.remove(); reject(new Error('YouTube could not be reached.')); };
    document.head.appendChild(script);
  });
  return apiPromise;
}
export default function VideoPlayer({video}:{video:(string|number)[]}) {
  const host = useRef<HTMLDivElement>(null);
  const [error,setError] = useState('');
  const [ready,setReady] = useState(false);
  const [attempt,setAttempt] = useState(0);
  const [title,id,start,end] = video;
  useEffect(() => {
    let cancelled = false, player: Player | undefined;
    setError(''); setReady(false);
    const timer = setTimeout(() => { if (!cancelled) setError('The player is taking longer than expected. Retry, or open this lesson on YouTube.'); },18000);
    const frame = document.createElement('iframe');
    frame.title = String(title); frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&origin=${encodeURIComponent(location.origin)}&widget_referrer=${encodeURIComponent(location.origin)}&start=${Number(start)||0}${Number(end)>Number(start) ? `&end=${Number(end)}` : ''}&rel=0&playsinline=1`;
    host.current?.replaceChildren(frame);
    api().then(YT => {
      if (cancelled) return;
      player = new YT.Player(frame, {events:{onReady:()=>{ clearTimeout(timer);setReady(true);setError(''); },onError:event=>{
        clearTimeout(timer);
        const message: Record<number,string> = {100:'This video is no longer available.',101:'The creator only allows playback on YouTube.',150:'The creator only allows playback on YouTube.',153:'YouTube could not identify this page. Open the course in your browser or watch on YouTube.',5:'Your browser could not play this video.'};
        setError(message[event.data] || `YouTube playback error ${event.data}. Try the direct link below.`);
      }}});
    }).catch(e => {if (!cancelled) setError(e.message);});
    return () => {cancelled=true;clearTimeout(timer);player?.destroy();frame.remove();};
  },[title,id,start,end,attempt]);
  return <div className="video-block"><div className="player-frame" ref={host}/><div className="video-toolbar"><span><PlayCircle size={17}/>{ready ? 'YouTube lesson' : 'Connecting to YouTube'}</span><a href={`https://www.youtube.com/watch?v=${id}&t=${Number(start)||0}s`} target="_blank" rel="noopener">{Number(end)>0 ? 'Full video on YouTube' : 'Watch on YouTube'} <ExternalLink size={15}/></a></div>{error && <div className="playback-error" role="status"><p>{error}</p><button className="secondary" onClick={()=>setAttempt(a=>a+1)}><RotateCw size={15}/> Retry player</button></div>}</div>;
}
