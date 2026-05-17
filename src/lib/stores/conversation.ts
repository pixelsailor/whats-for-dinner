import { writable } from 'svelte/store';

export type ConversationEntry = {
  question: string;
  answer: string;
  timestamp: number;
};

export const converation = writable<ConversationEntry[]>([]);
