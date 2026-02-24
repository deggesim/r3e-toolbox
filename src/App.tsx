import {
  faCheck,
  faExclamationTriangle,
  faSearch,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import FloatingProcessingLog from "./components/FloatingProcessingLog";
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
import { useProcessingLogStore } from "./store/processingLogStore";
import type { RaceRoomData } from "./types";
import { validateR3eData } from "./utils/r3eDataValidator";

// Protected route component
const ProtectedRoute = ({ element }: { element: ReactElement }) => {
  const gameData = useGameDataStore((state) => state.gameData);

  if (!gameData) {
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
  const gameData = useGameDataStore((state) => state.gameData);
  const autoLoadAttemptedRef = useRef(false);
  const electron = useElectronAPI();
  const { setGameData } = useGameDataStore();
  const addLog = useProcessingLogStore((state) => state.addLog);

  // Try to load game data automatically on mount
  useEffect(() => {
    const autoLoadGameData = async () => {
      // Prevent double execution in React StrictMode (dev mode)
      if (autoLoadAttemptedRef.current) return;
      autoLoadAttemptedRef.current = true;

      addLog(
        "info",
        "Searching for r3e-data.json in standard paths...",
        faSearch,
      );

      try {
        const result = await electron.findR3eDataFile();
        if (result.success && result.data) {
          addLog(
            "success",
            `Found r3e-data.json at: ${result.path || "auto-detected path"}`,
            faCheck,
          );
          addLog("info", "Validating file structure...");

          // Validate and parse the data
          const parsed = JSON.parse(result.data);
          const validation = validateR3eData(parsed);

          if (validation.valid) {
            addLog("success", "File structure is valid");

            // Log stats
            const classCount = Object.keys(parsed.classes).length;
            const trackCount = Object.keys(parsed.tracks).length;
            addLog(
              "info",
              `Loaded ${classCount} classes and ${trackCount} tracks`,
            );

            // Log warnings if any
            if (validation.warnings.length > 0) {
              validation.warnings.forEach((warning) => {
                addLog("warning", warning, faExclamationTriangle);
              });
            }

            setGameData(parsed as RaceRoomData);
            addLog("success", "Game data loaded successfully!", faCheck);
          } else {
            validation.errors.forEach((error) => {
              addLog("error", error, faXmark);
            });
            addLog(
              "error",
              "Failed to load game data: validation errors",
              faXmark,
            );
          }
        } else {
          addLog(
            "warning",
            "r3e-data.json not found in standard paths. Please upload it manually.",
            faExclamationTriangle,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        addLog("error", `Failed to load game data: ${message}`, faXmark);
      }
    };

    if (electron.isElectron) {
      autoLoadGameData();
    } else {
      addLog(
        "warning",
        "Game data can only be loaded in Electron mode from RaceRoom installation",
        faExclamationTriangle,
      );
      return;
    }
  }, [electron.isElectron]);

  return (
    <>
      <NavigationListener />
      {gameData ? (
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
      {/* Global Processing Log */}
      <FloatingProcessingLog />
    </HashRouter>
  );
};

export default App;
