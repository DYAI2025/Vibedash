/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProjectProvider } from './store/ProjectContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { DataSources } from './pages/DataSources';
import { Insights } from './pages/Insights';
import { Integrations } from './pages/Integrations';
import { Terminal } from './pages/Terminal';

export default function App() {
  return (
    <ProjectProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="data" element={<DataSources />} />
            <Route path="insights" element={<Insights />} />
            <Route path="terminal" element={<Terminal />} />
            <Route path="integrations" element={<Integrations />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProjectProvider>
  );
}
