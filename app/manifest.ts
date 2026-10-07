import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Automation Academy',
    short_name: 'Academy',
    description: 'Learn AI automation engineering: lessons, quizzes and daily review.',
    start_url: '/#today',
    display: 'standalone',
    background_color: '#f7f9fc',
    theme_color: '#2855e8',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
