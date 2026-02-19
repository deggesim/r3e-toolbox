import type { ReactElement } from "react";
import { useEffect } from "react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import Layout from "./components/Layout";
import { useElectronAPI } from "./hooks/useElectronAPI";
import AIManagement from "./pages/AIManagement";
import BuildResultsDatabase from "./pages/BuildResultsDatabase";
import FixQualyTimes from "./pages/FixQualyTimes";
import GameDataOnboarding from "./pages/GameDataOnboarding";
import Help from "./pages/Help";
import ResultsDatabaseDetail from "./pages/ResultsDatabaseDetail";
import ResultsDatabaseViewer from "./pages/ResultsDatabaseViewer";
import Settings from "./pages/Settings";
import { useConfigStore } from "./store/configStore";
import { useGameDataStore } from "./store/gameDataStore";

// Protected route component
const ProtectedRoute = ({ element }: { element: ReactElement }) => {
  const isLoaded = useGameDataStore((state) => state.isLoaded);

  if (!isLoaded) {
    return <Navigate to="/" replace />;
  }

  return element;
};

// Navigation listener component (must be inside Router context)
const NavigationListener = () => {
  const navigate = useNavigate();
  const { isElectron } = useElectronAPI();

  useEffect(() => {
    if (isElectron && window.electron?.onNavigate) {
      const unsubscribe = window.electron.onNavigate((path: string) => {
        navigate(path);
      });
      return unsubscribe;
    }

    return undefined;
  }, [isElectron, navigate]);

  return null;
};

const AppContent = () => {
  const isLoaded = useGameDataStore((state) => state.isLoaded);
  const forceOnboarding = useGameDataStore((state) => state.forceOnboarding);

  return (
    <>
      <NavigationListener />
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
            <Route path="/help" element={<Help />} />
          </Routes>
        </Layout>
      ) : (
        <Routes>
          <Route path="/" element={<GameDataOnboarding />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
};

const App = () => {
  const initializeConfig = useConfigStore((state) => state.initializeConfig);

  // Initialize config settings on app startup
  useEffect(() => {
    initializeConfig();
  }, [initializeConfig]);

  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;
