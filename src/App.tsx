import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useGameDataStore } from "./store/gameDataStore";
import Layout from "./components/Layout";
import GameDataOnboarding from "./components/GameDataOnboarding";
import AIManagement from "./components/AIManagement";
import FixQualyTimes from "./components/FixQualyTimes";
import BuildResultsDatabase from "./components/BuildResultsDatabase";
import ResultsDatabaseViewer from "./components/ResultsDatabaseViewer";
import ResultsDatabaseDetail from "./components/ResultsDatabaseDetail";
import Settings from "./components/Settings";
import "./App.css";

// Protected route component
function ProtectedRoute({ element }: { element: React.ReactElement }) {
  const isLoaded = useGameDataStore((state) => state.isLoaded);

  if (!isLoaded) {
    return <Navigate to="/" replace />;
  }

  return element;
}

function App() {
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
}

export default App;
