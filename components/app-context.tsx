'use client';
import { createContext, useContext } from 'react';
import type { Question } from '@/lib/lessons';
import type { Stored } from '@/lib/state';

export type App = {
  values: Stored;
  loaded: boolean;
  change: (key: string, value: Stored[string]) => void;
  go: (path: string) => void;
  answer: (q: Question, correct: boolean) => void;
  openDoc: (doc: string[]) => void;
};

export const AppContext = createContext<App | null>(null);
export const useApp = () => useContext(AppContext)!;
