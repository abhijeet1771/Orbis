import React, { useEffect, useState } from 'react';
import type { CausalNode } from '@orbisreport/core';

/**
 * Code Context Panel - Center Column Component
 *
 * Only ONE method visible at a time
 * Syntax highlighted
 * Failure line emphasized
 * Call-site emphasized when applicable
 */
export interface CodeContextPanelProps {
  selectedNode: CausalNode | null;
  causalChain: { nodes: CausalNode[] };
}

export function CodeContextPanel({ selectedNode, causalChain }: CodeContextPanelProps): JSX.Element {
  const [codeSnippet, setCodeSnippet] = useState<CodeSnippet | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch code when selected node changes
  useEffect(() => {
    if (!selectedNode) {
      setCodeSnippet(null);
      return;
    }

    setLoading(true);

    // Simulate fetching method code
    // In real implementation, this would call the code fetching API
    fetchMethodCode(selectedNode)
      .then(setCodeSnippet)
      .finally(() => setLoading(false));
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <div className="code-context-panel">
        <div className="code-context-panel__empty">
          <h3>Code Context</h3>
          <p>Select a node to view method code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="code-context-panel">
      <div className="code-context-panel__header">
        <h3>{selectedNode.title}</h3>
        <div className="code-context-panel__meta">
          {selectedNode.location && (
            <span className="code-context-panel__location">
              {selectedNode.location.file}:{selectedNode.location.line}
            </span>
          )}
        </div>
      </div>

      <div className="code-context-panel__content">
        {loading ? (
          <div className="code-context-panel__loading">
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
          </div>
        ) : codeSnippet ? (
          <CodeSnippetDisplay
            snippet={codeSnippet}
            node={selectedNode}
            causalChain={causalChain}
          />
        ) : (
          <div className="code-context-panel__no-code">
            <p>No code available for this layer</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Code snippet display with syntax highlighting and emphasis
 */
interface CodeSnippetDisplayProps {
  snippet: CodeSnippet;
  node: CausalNode;
  causalChain: { nodes: CausalNode[] };
}

function CodeSnippetDisplay({ snippet, node, causalChain }: CodeSnippetDisplayProps): JSX.Element {
  const lines = snippet.content.split('\n');

  return (
    <div className="code-snippet">
      <div className="code-snippet__header">
        <span className="code-snippet__language">{snippet.language}</span>
        <span className="code-snippet__range">
          Lines {snippet.startLine}–{snippet.endLine}
        </span>
      </div>

      <pre className="code-snippet__content">
        <code>
          {lines.map((line, index) => {
            const lineNumber = snippet.startLine + index;
            const isFailureLine = snippet.highlights?.failureLine === lineNumber;
            const isCallSiteLine = snippet.highlights?.callSiteLine === lineNumber;

            return (
              <div
                key={lineNumber}
                className={`code-line ${
                  isFailureLine ? 'code-line--failure' :
                  isCallSiteLine ? 'code-line--callsite' : ''
                }`}
              >
                <span className="code-line__number">{lineNumber}</span>
                <span className="code-line__content">{line}</span>
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

/**
 * Simulated method code fetching
 * In real implementation, this would call the server API
 */
async function fetchMethodCode(node: CausalNode): Promise<CodeSnippet | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Mock code snippets based on node type
  if (node.codeSnippet) {
    return {
      content: node.codeSnippet.content,
      language: node.codeSnippet.language,
      startLine: 1,
      endLine: node.codeSnippet.content.split('\n').length,
      highlights: node.codeSnippet.highlightLines ? {
        failureLine: node.codeSnippet.highlightLines[0]
      } : undefined
    };
  }

  // Generate mock code based on node type
  switch (node.type) {
    case 'failure':
      return {
        content: `describe('User Authentication', () => {\n  it('should login with valid credentials', async () => {\n    const response = await api.login({\n      email: 'user@example.com',\n      password: 'password123'\n    });\n    expect(response.status).toBe(200); // ← FAILURE HERE\n    expect(response.data.token).toBeDefined();\n  });\n});`,
        language: 'javascript',
        startLine: 1,
        endLine: 9,
        highlights: { failureLine: 6 }
      };

    case 'method':
      return {
        content: `async function login(credentials) {\n  const { email, password } = credentials;\n  \n  // Validate input\n  if (!email || !password) {\n    throw new Error('Email and password required');\n  }\n  \n  // Call authentication service\n  const user = await authService.authenticate(email, password);\n  \n  return {\n    status: 200,\n    data: { token: generateToken(user) }\n  };\n}`,
        language: 'javascript',
        startLine: 10,
        endLine: 25
      };

    case 'caller':
      return {
        content: `async function authenticate(email, password) {\n  // Hash password\n  const hashedPassword = await bcrypt.hash(password, 10);\n  \n  // Find user in database\n  const user = await User.findOne({ email });\n  if (!user) {\n    throw new Error('User not found');\n  }\n  \n  // Verify password\n  const isValid = await bcrypt.compare(password, user.passwordHash);\n  if (!isValid) {\n    throw new Error('Invalid password');\n  }\n  \n  return user;\n}`,
        language: 'javascript',
        startLine: 30,
        endLine: 45
      };

    default:
      return null;
  }
}

/**
 * Code snippet interface
 */
interface CodeSnippet {
  content: string;
  language: string;
  startLine: number;
  endLine: number;
  highlights?: {
    failureLine?: number;
    callSiteLine?: number;
  };
}
