import { promises as fs } from 'fs';
import path from 'path';

export interface CodeFetchResult {
  methodBody: string;
  startLine: number;
  endLine: number;
  language: string;
  highlights?: {
    failureLine?: number;
    callSiteLine?: number;
  };
}

export interface CodeFetchInput {
  file: string;
  line: number;
  callerLine?: number; // For highlighting call-site
}

/**
 * Fetch method code containing the specified line.
 * Returns only the method body, never the full file.
 * Best-effort parsing with regex - never throws.
 */
export async function fetchMethodCode(input: CodeFetchInput): Promise<CodeFetchResult | undefined> {
  try {
    // Resolve file path relative to workspace
    const filePath = path.resolve(input.file);

    // Check if file exists and is readable
    try {
      await fs.access(filePath);
    } catch {
      return undefined; // File not accessible
    }

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    // Detect language from file extension
    const language = detectLanguage(input.file);
    if (!language) return undefined;

    // Find method boundaries
    const methodBounds = findMethodBounds(content, input.line, language);
    if (!methodBounds) return undefined;

    // Extract method lines
    const methodLines = lines.slice(methodBounds.startLine - 1, methodBounds.endLine);
    const methodBody = methodLines.join('\n');

    // Calculate highlights relative to method start
    const highlights: CodeFetchResult['highlights'] = {};
    if (input.line >= methodBounds.startLine && input.line <= methodBounds.endLine) {
      highlights.failureLine = input.line - methodBounds.startLine + 1;
    }
    if (input.callerLine && input.callerLine >= methodBounds.startLine && input.callerLine <= methodBounds.endLine) {
      highlights.callSiteLine = input.callerLine - methodBounds.startLine + 1;
    }

    return {
      methodBody,
      startLine: methodBounds.startLine,
      endLine: methodBounds.endLine,
      language,
      highlights: Object.keys(highlights).length > 0 ? highlights : undefined
    };
  } catch {
    // Never throw - return undefined on any error
    return undefined;
  }
}

/**
 * Detect programming language from file extension
 */
function detectLanguage(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.js':
    case '.mjs':
    case '.cjs':
      return 'javascript';
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.py':
      return 'python';
    case '.java':
      return 'java';
    case '.rb':
      return 'ruby';
    case '.php':
      return 'php';
    case '.cs':
      return 'csharp';
    case '.go':
      return 'go';
    case '.rs':
      return 'rust';
    default:
      return undefined;
  }
}

/**
 * Find method boundaries using regex patterns
 */
function findMethodBounds(content: string, targetLine: number, language: string): { startLine: number; endLine: number } | undefined {
  const lines = content.split('\n');

  // Ensure target line is valid
  if (targetLine < 1 || targetLine > lines.length) return undefined;

  switch (language) {
    case 'javascript':
    case 'typescript':
      return findJavaScriptMethodBounds(content, targetLine);
    case 'python':
      return findPythonMethodBounds(content, targetLine);
    case 'java':
      return findJavaMethodBounds(content, targetLine);
    default:
      // Fallback: find function-like patterns
      return findGenericFunctionBounds(content, targetLine);
  }
}

/**
 * Find JavaScript/TypeScript method boundaries
 */
function findJavaScriptMethodBounds(content: string, targetLine: number): { startLine: number; endLine: number } | undefined {
  const lines = content.split('\n');

  // Look for function declarations, arrow functions, class methods
  const patterns = [
    // function name(...) {
    /^\s*function\s+\w+\s*\([^)]*\)\s*\{/gm,
    // const name = (...) => {
    /^\s*const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{/gm,
    // name = (...) => {
    /^\s*\w+\s*=\s*\([^)]*\)\s*=>\s*\{/gm,
    // class method: name(...) {
    /^\s*\w+\s*\([^)]*\)\s*\{/gm,
    // async function name(...) {
    /^\s*async\s+function\s+\w+\s*\([^)]*\)\s*\{/gm,
    // async name = (...) => {
    /^\s*async\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{/gm
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const matchLine = content.substring(0, match.index).split('\n').length;

      if (matchLine <= targetLine) {
        // Find the matching closing brace
        const result = findMatchingBrace(content, match.index + match[0].length - 1);
        if (result && result.end > match.index) {
          const endLine = content.substring(0, result.end).split('\n').length;
          if (targetLine <= endLine) {
            return { startLine: matchLine, endLine };
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Find Python method boundaries
 */
function findPythonMethodBounds(content: string, targetLine: number): { startLine: number; endLine: number } | undefined {
  const lines = content.split('\n');

  // Look for def name(...): patterns
  const pattern = /^\s*def\s+\w+\s*\([^)]*\)\s*:/gm;

  let match;
  while ((match = pattern.exec(content)) !== null) {
    const matchLine = content.substring(0, match.index).split('\n').length;

    if (matchLine <= targetLine) {
      // Find the end of the function (next def at same indentation or end of file)
      const functionEnd = findPythonFunctionEnd(content, match.index, matchLine);
      if (functionEnd && targetLine <= functionEnd) {
        return { startLine: matchLine, endLine: functionEnd };
      }
    }
  }

  return undefined;
}

/**
 * Find Java method boundaries
 */
function findJavaMethodBounds(content: string, targetLine: number): { startLine: number; endLine: number } | undefined {
  const lines = content.split('\n');

  // Look for method signatures
  const patterns = [
    // public/private/protected static? returnType name(...) {
    /^\s*(public|private|protected)?\s*(static)?\s*\w+\s+\w+\s*\([^)]*\)\s*\{/gm,
    // constructor: public/private/protected ClassName(...) {
    /^\s*(public|private|protected)?\s*\w+\s*\([^)]*\)\s*\{/gm
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const matchLine = content.substring(0, match.index).split('\n').length;

      if (matchLine <= targetLine) {
        const result = findMatchingBrace(content, match.index + match[0].length - 1);
        if (result && result.end > match.index) {
          const endLine = content.substring(0, result.end).split('\n').length;
          if (targetLine <= endLine) {
            return { startLine: matchLine, endLine };
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Generic function boundary finder for unsupported languages
 */
function findGenericFunctionBounds(content: string, targetLine: number): { startLine: number; endLine: number } | undefined {
  // Simple heuristic: find lines that look like function starts
  const lines = content.split('\n');
  const functionPatterns = [
    /^\s*(function|def|fn|func)\s+\w+/i,
    /^\s*\w+\s*=\s*(function|=>)/i,
    /^\s*class\s+\w+/i
  ];

  for (let i = Math.max(0, targetLine - 20); i < Math.min(lines.length, targetLine + 5); i++) {
    for (const pattern of functionPatterns) {
      if (pattern.test(lines[i])) {
        // Found a potential function start, look for a reasonable end
        const startLine = i + 1;
        const endLine = Math.min(lines.length, startLine + 30); // Limit to 30 lines
        if (targetLine >= startLine && targetLine <= endLine) {
          return { startLine, endLine };
        }
      }
    }
  }

  return undefined;
}

/**
 * Find matching closing brace
 */
function findMatchingBrace(content: string, openBraceIndex: number): { end: number } | undefined {
  let braceCount = 0;
  for (let i = openBraceIndex; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
    } else if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        return { end: i };
      }
    }
  }
  return undefined;
}

/**
 * Find Python function end (next function at same indentation or less)
 */
function findPythonFunctionEnd(content: string, startIndex: number, startLine: number): number | undefined {
  const lines = content.split('\n');
  const startLineContent = lines[startLine - 1];
  const indentation = startLineContent.match(/^\s*/)?.[0].length || 0;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    // Check for next function/method at same or less indentation
    if (/^\s*(def|class)\s+/.test(line)) {
      const lineIndentation = line.match(/^\s*/)?.[0].length || 0;
      if (lineIndentation <= indentation) {
        return i; // End before next function
      }
    }
    // Check for end of file
    if (i === lines.length - 1) {
      return i + 1;
    }
  }

  return lines.length;
}
