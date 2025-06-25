/**
 * Simple input sanitizer for OpenAI queries
 */
export function sanitizePromptInput(input: string): string {
  return input
    .replace(/[<>`$]/g, '') // basic character strip
    .trim()
    .slice(0, 500) // cap length
}