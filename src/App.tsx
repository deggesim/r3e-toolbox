import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import AIManagement from "./components/AIManagement";
import FixQualyTimes from "./components/FixQualyTimes";
import BuildResultsDatabase from "./components/BuildResultsDatabase";
import ResultsDatabaseViewer from "./components/ResultsDatabaseViewer";
import ResultsDatabaseDetail from "./components/ResultsDatabaseDetail";
import Settings from "./components/Settings";
import "./App.css";

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/ai-management" replace />} />
          <Route path="/ai-management" element={<AIManagement />} />
          <Route path="/fix-qualy-times" element={<FixQualyTimes />} />
          <Route
            path="/build-results-database"
            element={<BuildResultsDatabase />}
          />
          <Route path="/results-database" element={<ResultsDatabaseViewer />} />
          <Route
            path="/results-database/:alias"
            element={<ResultsDatabaseDetail />}
          />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
