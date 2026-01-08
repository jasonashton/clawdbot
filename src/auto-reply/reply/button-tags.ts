import type { InlineButtonRow } from "../types.js";

/**
 * Strip button syntax fragments from text that may be a partial chunk.
 * Used when buttons have been extracted from joined text but individual
 * payloads still contain raw syntax fragments.
 */
export function stripButtonSyntaxFragments(text?: string): string {
  if (!text) return "";
  return text
    .replace(/\[\[buttons\]\]/gi, "")
    .replace(/\[\[\/buttons\]\]/gi, "")
    .replace(/\[([^\]|]+)\|([^\]]+)\]/g, "") // [Label|data] patterns
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * Extract inline button tags from agent output.
 *
 * Syntax:
 *   [[buttons]]
 *   [Label 1|data1][Label 2|data2]
 *   [Label 3|data3]
 *   [[/buttons]]
 *
 * Each line inside the block becomes a row of buttons.
 * Each [Label|data] becomes a button.
 *
 * Returns the cleaned text (tags removed) and parsed buttons.
 */
export function extractButtonTags(text?: string): {
  cleaned: string;
  buttons?: InlineButtonRow[];
  hasTag: boolean;
} {
  if (!text) return { cleaned: "", hasTag: false };

  // Match [[buttons]]...[[/buttons]] block
  const blockMatch = text.match(
    /\[\[buttons\]\]\s*([\s\S]*?)\s*\[\[\/buttons\]\]/i,
  );

  if (!blockMatch) {
    return { cleaned: text, hasTag: false };
  }

  const blockContent = blockMatch[1];
  const buttons: InlineButtonRow[] = [];

  // Split by newlines to get rows
  const lines = blockContent.split(/\n/).filter((line) => line.trim());

  for (const line of lines) {
    const row: InlineButtonRow = [];
    // Match all [Label|data] patterns in the line
    const buttonMatches = line.matchAll(/\[([^\]|]+)\|([^\]]+)\]/g);

    for (const match of buttonMatches) {
      const label = match[1].trim();
      const data = match[2].trim();
      if (label && data) {
        // Telegram limits callback_data to 64 bytes
        if (data.length <= 64) {
          row.push({ text: label, data });
        }
      }
    }

    if (row.length > 0) {
      buttons.push(row);
    }
  }

  // Remove the block from text
  const cleaned = text
    .replace(/\[\[buttons\]\]\s*[\s\S]*?\s*\[\[\/buttons\]\]/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n") // collapse 3+ newlines to 2
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();

  return {
    cleaned,
    buttons: buttons.length > 0 ? buttons : undefined,
    hasTag: true,
  };
}
