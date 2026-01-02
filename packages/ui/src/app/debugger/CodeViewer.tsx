import { useEffect, useMemo, useState } from 'react';
import { SkeletonBlock, SkeletonLine } from '../../common/skeleton';
import './codeviewer.css';

interface Props {
  filePath: string;
  highlightLine?: number;
  flashKey?: string;
}

interface LoadState {
  status: 'idle' | 'loading' | 'error' | 'ready';
  lines: string[];
  startLine: number;
  error?: string;
}

export function CodeViewer({ filePath, highlightLine, flashKey }: Props): JSX.Element {
  const [state, setState] = useState<LoadState>({
    status: 'idle',
    lines: [],
    startLine: 1
  });
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let mounted = true;
    setState(s => ({ ...s, status: 'loading', error: undefined }));
    fetchSource(filePath)
      .then(content => {
        if (!mounted) return;
        const lines = content.split('\n');
        const lineIdx = highlightLine ? Math.max(highlightLine - 1, 0) : 0;
        const start = Math.max(lineIdx - 12, 0);
        const end = Math.min(lineIdx + 12, lines.length - 1);
        setState({
          status: 'ready',
          lines: lines.slice(start, end + 1),
          startLine: start + 1
        });
      })
      .catch(err => {
        if (!mounted) return;
        setState({ status: 'error', lines: [], startLine: 1, error: err.message });
      });
    return () => {
      mounted = false;
    };
  }, [filePath, highlightLine]);

  useEffect(() => {
    if (!flashKey) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 800);
    return () => clearTimeout(t);
  }, [flashKey]);

  const editorLink = useMemo(() => {
    if (!highlightLine) return `vscode://file/${filePath}`;
    return `vscode://file/${filePath}:${highlightLine}`;
  }, [filePath, highlightLine]);

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="codeviewer">
        <div className="codeviewer__path">{filePath}</div>
        <SkeletonLine width="60%" />
        <SkeletonBlock height={200} />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="codeviewer">
        <div className="codeviewer__path">{filePath}</div>
        <div>Source not available.</div>
        <div className="muted">{state.error}</div>
      </div>
    );
  }

  return (
    <div className="codeviewer">
      <div className="codeviewer__path">
        <span>{filePath}</span>
        <div className="codeviewer__actions">
          <button onClick={() => navigator.clipboard.writeText(filePath)} className="codeviewer__btn">
            Copy path
          </button>
          <a href={editorLink} className="codeviewer__btn" target="_blank" rel="noreferrer">
            Open in editor
          </a>
        </div>
      </div>
      <pre className="codeviewer__pre">
        {state.lines.map((line, idx) => {
          const lineNumber = state.startLine + idx;
          const isHighlight = highlightLine === lineNumber;
          return (
            <div
              key={lineNumber}
              className={`codeviewer__line ${isHighlight ? 'codeviewer__line--highlight' : ''} ${
                flash && isHighlight ? 'codeviewer__line--flash' : ''
              }`}
            >
              <span className="codeviewer__gutter">{lineNumber}</span>
              <span className="codeviewer__code">{line}</span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}

async function fetchSource(path: string): Promise<string> {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(encodeURI(safePath), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch source: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

