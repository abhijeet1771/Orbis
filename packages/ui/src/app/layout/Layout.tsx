import { Outlet, Link, useLocation } from 'react-router-dom';
import './layout.css';
import { useDataContext } from '../data/DataContext';

export function Layout(): JSX.Element {
  const { mode, setMode } = useDataContext();
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
      </header>
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  );
}

