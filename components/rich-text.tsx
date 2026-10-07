'use client';
import { Fragment } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { glossary } from '@/lib/glossary';
import { lessons } from '@/lib/lessons';

// Shared definitions plus each module's own.
const terms: Record<string, string> = Object.assign({}, ...Object.values(lessons).map(l => l.glossary ?? {}), glossary);

// Renders **bold**, *italic*, `code` and [[glossary term|label]] inside one line of lesson text.
function Inline({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[\[[^\]]+\]\])/g).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('[[')) {
      const [term, label] = part.slice(2, -2).split('|');
      const definition = terms[term.toLowerCase()];
      if (!definition) return <Fragment key={i}>{label ?? term}</Fragment>;
      return <Popover key={i}>
        <PopoverTrigger className="term">{label ?? term}</PopoverTrigger>
        <PopoverContent className="term-card"><b>{term}</b><p>{definition}</p></PopoverContent>
      </Popover>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

// A block is a paragraph, or a list when every line starts with "- " or "1. ".
export default function RichText({ blocks }: { blocks: string[] }) {
  return <>{blocks.map((block, i) => {
    const lines = block.split('\n');
    if (lines.every(l => l.startsWith('- '))) return <ul key={i}>{lines.map((l, j) => <li key={j}><Inline text={l.slice(2)} /></li>)}</ul>;
    if (lines.every(l => /^\d+\. /.test(l))) return <ol key={i}>{lines.map((l, j) => <li key={j}><Inline text={l.replace(/^\d+\. /, '')} /></li>)}</ol>;
    return <p key={i}><Inline text={block} /></p>;
  })}</>;
}

export { Inline };
