import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '../common/visual/index.js'; /* Phase 8.4 - Visual Language System */
import { Layout } from './layout/Layout';
import { RunListPage } from './runs/RunListPage';
import { RunDetailPage } from './runs/RunDetailPage';
import { DebuggerPage } from './debugger/DebuggerPage';
import { TestHistoryPage } from './history/TestHistoryPage';
import { ExecutionHistoryPage } from './history/ExecutionHistoryPage';
import { RiskHistoryPage } from './history/RiskHistoryPage';
import { ExecutiveOverviewPage } from './overview/ExecutiveOverviewPage';
import { ExplorerPage } from './explorer/ExplorerPage';
import { ArtifactsPage } from './artifacts/ArtifactsPage';
import { DataProvider } from './data/DataContext';
import { RouteTransition } from '../common/transitions/RouteTransition';
import { RouteContextBoundary } from './RouteContextBoundary';

export default function App(): JSX.Element {
  return (
    <BrowserRouter basename="/ui">
      <DataProvider>
        <Routes>
          <Route
            element={
              <RouteTransition>
                <RouteContextBoundary>
                  <Layout />
                </RouteContextBoundary>
              </RouteTransition>
            }
          >
            <Route path="/" element={<RunListPage />} />
            <Route path="/runs/:runId" element={<ExecutiveOverviewPage />} />
            <Route path="/runs/:runId/index" element={<RunDetailPage />} />
            <Route path="/runs/:runId/explorer" element={<ExplorerPage />} />
            <Route path="/runs/:runId/artifacts" element={<ArtifactsPage />} />
            <Route path="/runs/:runId/tests/:testId/debugger" element={<DebuggerPage />} />
            <Route path="/runs/:runId/history" element={<ExecutionHistoryPage />} />
            <Route path="/runs/:runId/risk-history" element={<RiskHistoryPage />} />
            <Route path="/tests/:testId/history" element={<TestHistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </DataProvider>
    </BrowserRouter>
  );
}
