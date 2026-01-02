import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import './routeTransition.css';

export function RouteTransition({ children }: { children: React.ReactNode }): JSX.Element {
  const location = useLocation();
  const key = useMemo(() => location.pathname + location.search, [location.pathname, location.search]);

  return (
    <div key={key} className="route-transition">
      {children}
    </div>
  );
}

