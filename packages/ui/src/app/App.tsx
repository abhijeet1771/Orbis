import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './layout/Layout';
import { RunListPage } from './runs/RunListPage';
import { RunDetailPage } from './runs/RunDetailPage';
import { DebuggerPage } from './debugger/DebuggerPage';
import { TestHistoryPage } from './history/TestHistoryPage';
import { ExecutiveOverviewPage } from './overview/ExecutiveOverviewPage';
import { ExplorerPage } from './explorer/ExplorerPage';
import { ArtifactsPage } from './artifacts/ArtifactsPage';
import { DataProvider } from './data/DataContext';

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <DataProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<RunListPage />} />
            <Route path="/runs/:runId" element={<ExecutiveOverviewPage />} />
            <Route path="/runs/:runId/index" element={<RunDetailPage />} />
            <Route path="/runs/:runId/explorer" element={<ExplorerPage />} />
            <Route path="/runs/:runId/artifacts" element={<ArtifactsPage />} />
            <Route path="/runs/:runId/tests/:testId/debugger" element={<DebuggerPage />} />
            <Route path="/tests/:testId/history" element={<TestHistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </DataProvider>
    </BrowserRouter>
  );
}
