import { Outlet, Link, useLocation } from 'react-router-dom';
import './layout.css';
import { useDataContext } from '../data/DataContext';
import { LiveProgress, RunningNowStrip, ActivityFeed, LiveCompletionBanner } from '../live/LiveProgress';

export function Layout(): JSX.Element {
  const { mode, setMode, workspaceName } = useDataContext();
  const location = useLocation();
  const isLive = mode === 'live';
  return (
    <div className="layout">
      <header className="layout__header">
        <Link to="/" className="layout__brand">
          OrbisReport
        </Link>
        <div className="layout__subtitle">
          <span className={`live-indicator ${isLive ? 'live-indicator--on' : ''}`}>
            {isLive ? 'LIVE' : 'STATIC'}
          </span>
          <button
            className="mode-toggle"
            onClick={() => setMode(isLive ? 'static' : 'live')}
            disabled={location.pathname === '/'}
            title="Toggle Live/Static data source"
          >
            Switch to {isLive ? 'Static' : 'Live'}
          </button>
        </div>
        <div className="layout__workspace">
          Workspace: {workspaceName ?? 'Unknown'}
        </div>
      </header>
      <div className="layout__live">
        {isLive && <LiveProgress />}
        {isLive && <RunningNowStrip />}
        {isLive && <ActivityFeed />}
        {isLive && <LiveCompletionBanner />}
      </div>
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  );
}

