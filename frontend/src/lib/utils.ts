import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Helper to handle mixed content types (arrays, objects) and strip indentation that breaks markdown
// e.g. converting 4-space indented text (which render as code blocks) back to normal text
export const cleanContent = (content: any): string => {
    if (!content) return '';

    let text = '';

    // Handle array of prompts (common in LangChain/Agent data)
    if (Array.isArray(content)) {
        text = content.map(c => {
            if (typeof c === 'string') return c;
            if (typeof c === 'object' && c.content) return c.content; // OpenAI/LangChain message format
            return JSON.stringify(c);
        }).join('\n\n---\n\n');
    }
    else if (typeof content === 'object') {
        text = JSON.stringify(content, null, 2);
    } else {
        text = String(content);
    }

    // Strip leading indentation to prevent unintended code blocks
    // 1. Split into lines
    const lines = text.split('\n');
    // 2. Find minimum indentation (ignoring empty lines)
    const minIndent = lines
        .filter(l => l.trim().length > 0)
        .reduce((min, line) => {
            const indent = line.match(/^\s*/)?.[0].length || 0;
            return Math.min(min, indent);
        }, Infinity);

    // 3. Remove that indentation if it exists and is > 0
    if (minIndent > 0 && minIndent !== Infinity) {
        text = lines.map(l => l.slice(minIndent)).join('\n');
    }

    return text.trim();
};

// Helper to strip markdown syntax characters for plain text display
export const stripMarkdown = (text: string): string => {
    if (!text) return '';

    return text
        // Headers
        .replace(/^#+\s+/gm, '')
        // Bold/Italic
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        // Code blocks
        .replace(/```[\s\S]*?```/g, (match) => {
            // Keep content, strip fences
            return match.replace(/```/g, '');
        })
        .replace(/`([^`]+)`/g, '$1')
        // Links
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Lists
        .replace(/^(\s*)[-*+]\s+/gm, '$1• ')
        // Blockquotes
        .replace(/^>\s+/gm, '');
};
