"use server"
// formatConvHistory
// ------------------------------------------------------------

/**
 * Formats the conversation history for use in prompts.
 * @param messages - Array of strings representing conversation messages.
 * @returns A formatted string of conversation history.
 */
export function formatConvHistory(messages: string[]): string {
    return messages
      .map((message, i) => {
        if (i % 2 === 0) {
          return `Human: ${message}`;
        } else {
          return `AI: ${message}`;
        }
      })
      .join('\n');
  }
  
  // combineDocuments
  // ------------------------------------------------------------
  
  /**
   * Combines documents into a single string.
   * @param documents - Array of strings representing document contents.
   * @returns A single string combining all document contents.
   */
  export function combineDocuments(documents: string[]): string {
    return documents.join('\n\n');
  }
  
  // debounce
  // ------------------------------------------------------------
  
  /**
   * Debounces a function call by waiting a specified time
   * before invoking the function again.
   * 
   * @param func - The function to debounce.
   * @param wait - The delay in milliseconds.
   */
  export default function debounce(func: (...args: any[]) => void, wait: number) {
    let timeout: NodeJS.Timeout;
  
    return function (...args: any[]) {
      clearTimeout(timeout);
      // Removed `.apply(this, args)` and replaced with `func(...args)`
      timeout = setTimeout(() => func(...args), wait);
    };
  }