import React, { useMemo } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { ErrorBoundary } from '../common/error/ErrorBoundary';

export function RouteContextBoundary(): JSX.Element {
  const location = useLocation();
  const params = useParams();

  const contextLabel = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return 'Run List';
    if (path.match(/^\/runs\/[^/]+$/)) return 'Executive Overview';
    if (path.match(/^\/runs\/[^/]+\/index$/)) return 'Execution Index';
    if (path.match(/^\/runs\/[^/]+\/explorer$/)) return 'Explorer';
    if (path.match(/^\/runs\/[^/]+\/artifacts$/)) return 'Artifacts';
    if (path.match(/^\/runs\/[^/]+\/tests\/[^/]+\/debugger$/)) {
      return params.testId ? `Debugger for Test ${params.testId}` : 'Debugger';
    }
    if (path.match(/^\/tests\/[^/]+\/history$/)) {
      return params.testId ? `History for Test ${params.testId}` : 'Test History';
    }
    return 'OrbisReport';
  }, [location.pathname, params.testId]);

  return (
    <ErrorBoundary contextLabel={contextLabel}>
      <Outlet />
    </ErrorBoundary>
  );
}

