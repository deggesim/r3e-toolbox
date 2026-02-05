import type { ReactElement } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Layout from "./components/Layout";
import AIManagement from "./pages/AIManagement";
import BuildResultsDatabase from "./pages/BuildResultsDatabase";
import FixQualyTimes from "./pages/FixQualyTimes";
import GameDataOnboarding from "./pages/GameDataOnboarding";
import ResultsDatabaseDetail from "./pages/ResultsDatabaseDetail";
import ResultsDatabaseViewer from "./pages/ResultsDatabaseViewer";
import Settings from "./pages/Settings";
import { useGameDataStore } from "./store/gameDataStore";

// Protected route component
const ProtectedRoute = ({ element }: { element: ReactElement }) => {
  const isLoaded = useGameDataStore((state) => state.isLoaded);

  if (!isLoaded) {
    return <Navigate to="/" replace />;
  }

  return element;
};

const App = () => {
  const isLoaded = useGameDataStore((state) => state.isLoaded);
  const forceOnboarding = useGameDataStore((state) => state.forceOnboarding);

  return (
    <HashRouter>
      {isLoaded && !forceOnboarding ? (
        <Layout>
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/ai-management" replace />}
            />
            <Route
              path="/ai-management"
              element={<ProtectedRoute element={<AIManagement />} />}
            />
            <Route
              path="/fix-qualy-times"
              element={<ProtectedRoute element={<FixQualyTimes />} />}
            />
            <Route
              path="/build-results-database"
              element={<ProtectedRoute element={<BuildResultsDatabase />} />}
            />
            <Route
              path="/results-database"
              element={<ProtectedRoute element={<ResultsDatabaseViewer />} />}
            />
            <Route
              path="/results-database/:alias"
              element={<ProtectedRoute element={<ResultsDatabaseDetail />} />}
            />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      ) : (
        <Routes>
          <Route path="/" element={<GameDataOnboarding />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </HashRouter>
  );
};

export default App;
