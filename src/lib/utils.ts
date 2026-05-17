/**
 * Simple input sanitizer for OpenAI queries
 */
export function sanitizePromptInput(input: string): string {
  return input
    .replace(/[<>`$]/g, '') // basic character strip
    .trim()
    .slice(0, 500); // cap length
}

/**
 * Keywords to auto-detect type of LLM query
 *
 * TODO: it's probably easier to reverse the logic and detect commands to modify a recipe
 */
export function isGeneralCookingQuestion(input: string): boolean {
  const keywords = ['how do I', 'what happens if', 'can I use', "what's the best", 'how long should', 'should I', 'what is', 'is it okay to', 'why does'];

  const lowered = input.toLowerCase().trim();
  return keywords.some((k) => lowered.startsWith(k) || lowered.includes(k));
}

export function isModificationRequest(input: string): boolean {
  const keywords = [
    'update',
    'change',
    'replace',
    'add',
    'remove',
    'increase',
    'decrease',
    'reduce',
    'take out',
    'swap',
    'substitute',
    'use',
    'alter',
    'convert to',
    'adjust',
    'omit',
    'make this',
    'make it',
    'modify',
    'double',
    'triple',
    'halve',
    'cut it',
    'cut this',
    'cut the',
    'split',
    'turn this into',
    'transform'
  ];

  const lowered = input.toLowerCase().trim();
  return keywords.some((k) => lowered.startsWith(k));
}

export function sentenceCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
