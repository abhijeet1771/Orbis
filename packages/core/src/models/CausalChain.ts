/**
 * This hierarchy is reversed intentionally.
 * Humans debug from effect → cause, not execution order.
 * Orbis models human reasoning, not runtime stacks.
 */

export type CausalNodeType =
  | 'failure'
  | 'method'
  | 'caller'
  | 'stepdef'
  | 'test'
  | 'feature';

export interface CausalNode {
  id: string;
  type: CausalNodeType;
  title: string;
  subtitle?: string;
  location?: {
    file: string;
    line: number;
    column?: number;
  };
  codeSnippet?: {
    language: string;
    content: string;
    highlightLines?: number[];
  };
  metadata?: Record<string, unknown>;
}

export interface CausalChain {
  rootFailureId: string;
  nodes: CausalNode[]; // ordered STRICTLY effect → cause
}
