import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faDatabase } from "@fortawesome/free-solid-svg-icons/faDatabase";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  ListGroup,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import SectionTitle from "../components/SectionTitle";
import { useResolveCarInfo } from "../hooks/useResolveCarInfo";
import { useChampionshipStore } from "../store/championshipStore";
import { useGameDataStore } from "../store/gameDataStore";
import { useLeaderboardAssetsStore } from "../store/leaderboardAssetsStore";
import { useProcessingLogStore } from "../store/processingLogStore";
import type { ChampionshipEntry, ParsedRace } from "../types/raceResults";
import type { LeaderboardAssets } from "../types/gameData";
import {
  fetchLeaderboardAssets,
  fetchLeaderboardAssetsWithCache,
} from "../utils/leaderboardAssets";
import { parseResultFiles } from "../utils/raceResultParser";
import {
  extractServerEventAlias,
  isServerEventFormat,
  parseServerEventData,
} from "../utils/serverEventParser";

const buildRaceKey = (race: ParsedRace): string => {
  const classInfo = race.slots.find(
    (slot) => slot.classId !== undefined || slot.className,
  );
  const classPart =
    classInfo?.classId === undefined
      ? classInfo?.className || "unknown-class"
      : String(classInfo.classId);
  const trackPart = race.trackid ? String(race.trackid) : race.trackname;
  return `${trackPart}::${classPart}`;
};

const AssetListItem = ({
  item,
}: {
  readonly item: { id: string; name: string; iconUrl?: string };
}) => {
  return (
    <ListGroup.Item className="bg-dark border-secondary d-flex gap-2 align-items-center py-2">
      {item.iconUrl ? (
        <img
          src={item.iconUrl}
          alt={item.name}
          style={{ objectFit: "contain", flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            background: "#1f1f2b",
            flexShrink: 0,
          }}
          aria-hidden
        />
      )}
      <div className="d-flex flex-column flex-grow-1 overflow-hidden">
        <span className="text-white small text-truncate">{item.name}</span>
        <span className="text-white-50" style={{ fontSize: "0.7rem" }}>
          ID: {item.id}
        </span>
      </div>
    </ListGroup.Item>
  );
};

const AssetLists = ({ assets }: { readonly assets: LeaderboardAssets }) => {
  return (
    <Row className="g-3 mt-2">
      <Col md={6}>
        <div className="mb-2">
          <strong className="text-white">
            Cars{" "}
            <Badge bg="light" text="dark" className="ms-1">
              {assets.cars?.length ?? 0}
            </Badge>
          </strong>
        </div>
        <div
          style={{
            maxHeight: "300px",
            overflowY: "auto",
            border: "1px solid #495057",
            borderRadius: "0.25rem",
          }}
        >
          <ListGroup variant="flush">
            {assets.cars && assets.cars.length > 0 ? (
              assets.cars.map((item) => (
                <AssetListItem key={`class-${item.id}`} item={item} />
              ))
            ) : (
              <ListGroup.Item className="bg-dark border-secondary text-white-50 text-center py-3">
                No cars found
              </ListGroup.Item>
            )}
          </ListGroup>
        </div>
      </Col>
      <Col md={6}>
        <div className="mb-2">
          <strong className="text-white">
            Tracks{" "}
            <Badge bg="light" text="dark" className="ms-1">
              {assets.tracks.length}
            </Badge>
          </strong>
        </div>
        <div
          style={{
            maxHeight: "300px",
            overflowY: "auto",
            border: "1px solid #495057",
            borderRadius: "0.25rem",
          }}
        >
          <ListGroup variant="flush">
            {assets.tracks.length > 0 ? (
              assets.tracks.map((item) => (
                <AssetListItem key={`track-${item.id}`} item={item} />
              ))
            ) : (
              <ListGroup.Item className="bg-dark border-secondary text-white-50 text-center py-3">
                No tracks found
              </ListGroup.Item>
            )}
          </ListGroup>
        </div>
      </Col>
    </Row>
  );
};

const BuildResultsDatabase = () => {
  const gameData = useGameDataStore((state) => state.gameData);
  const [assets, setAssets] = useState<LeaderboardAssets | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [htmlOverride, setHtmlOverride] = useState("");
  const [resultFiles, setResultFiles] = useState<File[]>([]);
  const [championshipAlias, setChampionshipAlias] = useState("");
  const [parsedRaces, setParsedRaces] = useState<ParsedRace[]>([]);
  const [isParsingRaces, setIsParsingRaces] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<
    ChampionshipEntry[] | null
  >(null);
  const databaseInputRef = useRef<HTMLInputElement>(null);
  const resultsInputRef = useRef<HTMLInputElement>(null);
  const serverEventInputRef = useRef<HTMLInputElement>(null);
  const [serverEventFiles, setServerEventFiles] = useState<File[]>([]);
  const addLog = useProcessingLogStore((state) => state.addLog);

  // Use store to read cached assets
  const cachedAssets = useLeaderboardAssetsStore((state) => state.assets);
  const clearAssets = useLeaderboardAssetsStore((state) => state.clearAssets);
  const championships = useChampionshipStore((state) => state.championships);
  const addOrUpdateChampionship = useChampionshipStore(
    (state) => state.addOrUpdate,
  );
  const setAllChampionships = useChampionshipStore((state) => state.setAll);

  const resultsSummary =
    resultFiles.length === 0
      ? "No files selected"
      : `${resultFiles.length} result file${resultFiles.length > 1 ? "s" : ""} selected`;

  // Initialize assets from cache on component mount
  useEffect(() => {
    if (cachedAssets) {
      setAssets(cachedAssets);
    }
  }, [cachedAssets]);

  // Prefill championship alias using the first class name, falling back to vehicle
  useEffect(() => {
    if (championshipAlias.trim() || parsedRaces.length === 0) return;
    const firstClass = parsedRaces
      .map((race) =>
        race.slots.find((slot) => slot.className?.trim())?.className?.trim(),
      )
      .find(Boolean);

    if (firstClass) {
      setChampionshipAlias(`${firstClass} Championship`);
      return;
    }

    const firstVehicle = parsedRaces[0]?.slots?.[0]?.vehicle;
    if (firstVehicle) {
      setChampionshipAlias(`${firstVehicle} Championship`);
    }
  }, [championshipAlias, parsedRaces]);

  const handleAssetsDownload = async () => {
    setIsLoadingAssets(true);
    setAssetsError(null);
    try {
      // If HTML override is provided, always fetch directly
      if (htmlOverride.trim()) {
        const data = await fetchLeaderboardAssets({
          htmlOverride: htmlOverride.trim(),
        });
        setAssets(data);
        // Manually save to store when using HTML override
        useLeaderboardAssetsStore.getState().setAssets(data);
      } else {
        // Use cache-aware fetch (already saves to store)
        const data = await fetchLeaderboardAssetsWithCache({
          forceRefresh: false,
        });
        setAssets(data);
      }
    } catch (error) {
      setAssets(null);
      setAssetsError(
        error instanceof Error ? error.message : "Error during download",
      );
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const onFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files ? Array.from(event.target.files) : [];
      setResultFiles(files);
      setChampionshipAlias(""); // Reset alias when files are selected
      setServerEventFiles([]);
      if (serverEventInputRef.current) {
        serverEventInputRef.current.value = "";
      }

      // Parse races immediately when files are selected
      if (files.length > 0 && gameData) {
        setIsParsingRaces(true);
        try {
          const races = await parseResultFiles(files, gameData, "default");
          setParsedRaces(races);
        } catch (error) {
          console.error("Error parsing races:", error);
        } finally {
          setIsParsingRaces(false);
        }
      } else {
        setParsedRaces([]);
      }
  };

  const onServerEventFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    setServerEventFiles(files);

    setResultFiles([]);
    if (resultsInputRef.current) resultsInputRef.current.value = "";

    if (files.length === 0 || !gameData) {
      setParsedRaces([]);
      return;
    }

    setIsParsingRaces(true);
    try {
      const all: ParsedRace[] = [];
      let aliasSet = false;
      for (const file of files) {
        try {
          const json: unknown = JSON.parse(await file.text());
          if (!isServerEventFormat(json)) {
            addLog("warning", `File is not a valid server event format: ${file.name}`, faXmark);
            continue;
          }
          if (!aliasSet) {
            setChampionshipAlias(extractServerEventAlias(json));
            aliasSet = true;
          }
          const races = parseServerEventData(json, gameData);
          if (!races || races.length === 0) {
            addLog("warning", `No Race session found in ${file.name}`, faXmark);
            continue;
          }
          all.push(...races);
        } catch {
          addLog("error", `Failed to parse server event file: ${file.name}`, faXmark);
        }
      }
      setParsedRaces(all);
    } finally {
      setIsParsingRaces(false);
    }
  };

  const { resolveCarName, resolveCarIcon } = useResolveCarInfo(
    gameData,
    assets,
  );

  const resolveCarInfo = () => {
    const humanSlot = parsedRaces
      .flatMap((race) => race.slots)
      .find((slot) => typeof slot.userId === "number" && slot.userId > 0);

    const fallbackSlot = parsedRaces[0]?.slots?.find(
      (slot) => slot.className || slot.vehicle,
    );

    const slot = humanSlot || fallbackSlot;
    if (!slot) return { carName: undefined, carIcon: undefined };

    return {
      carName: resolveCarName(slot),
      carIcon: resolveCarIcon(slot),
    };
  };

  const handleRestoreDatabase = async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        const importedChampionships: ChampionshipEntry[] = JSON.parse(content);

        // Validate structure
        if (
          !Array.isArray(importedChampionships) ||
          importedChampionships.length === 0
        ) {
          throw new Error(
            "Invalid database file: must contain an array of championships",
          );
        }

        // Basic validation of first item
        const first = importedChampionships[0];
        if (!first.alias || !first.races || typeof first.races !== "number") {
          throw new Error(
            "Invalid database format: missing required championship properties",
          );
        }

        setPendingRestoreFile(importedChampionships);
        setShowRestoreModal(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        addLog("error", `Error reading database file: ${message}`, faXmark);
        if (databaseInputRef.current) {
          databaseInputRef.current.value = "";
        }
      }
  };

  const confirmRestoreDatabase = () => {
    if (!pendingRestoreFile) return;

    setShowRestoreModal(false);
    setAllChampionships(pendingRestoreFile);
    addLog(
      "success",
      `Database restored with ${pendingRestoreFile.length} championship(s)`,
      faCheck,
    );
    addLog("success", "Database restoration complete", faCheck);
    setPendingRestoreFile(null);

    // Reset file input
    if (databaseInputRef.current) {
      databaseInputRef.current.value = "";
    }
  };

  const handleCreateOrUpdate = () => {
    const aliasTrimmed = championshipAlias.trim();

    setIsProcessing(true);

    try {
      addLog("info", `Championship alias: ${aliasTrimmed}`);

      if (!aliasTrimmed) {
        throw new Error("Championship alias cannot be empty");
      }
      addLog("success", "Championship alias is valid", faCheck);

      if (parsedRaces.length === 0) {
        throw new Error(
          "No races parsed. Select at least one RaceRoom result file",
        );
      }
      addLog("success", `${parsedRaces.length} race(s) parsed`, faCheck);

      // Check for existing championship
      const existing = championships.find(
        (c) => c.alias.toLowerCase() === aliasTrimmed.toLowerCase(),
      );

      if (existing) {
        addLog(
          "info",
          `Found existing championship with ${existing.races} race(s)`,
        );
      } else {
        addLog("info", "Creating new championship");
      }

      const baseRaces = existing?.raceData ?? [];
      addLog("info", `Base races count: ${baseRaces.length}`);

      // Build race key map to avoid duplicates
      const existingKeys = new Set(baseRaces.map(buildRaceKey));
      addLog(
        "info",
        `Existing unique race configurations: ${existingKeys.size}`,
      );

      const mergedRaces = [...baseRaces];
      let newRacesCount = 0;

      parsedRaces.forEach((race) => {
        const key = buildRaceKey(race);
        if (!existingKeys.has(key)) {
          mergedRaces.push(race);
          existingKeys.add(key);
          newRacesCount++;
        }
      });

      addLog(
        "success",
        `${newRacesCount} new race configuration(s) added, ${parsedRaces.length - newRacesCount} duplicate(s) skipped`,
        faCheck,
      );

      const { carName, carIcon } = resolveCarInfo();
      addLog("info", `Car: ${carName || "auto-detected"}`);

      addOrUpdateChampionship({
        alias: aliasTrimmed,
        fileName: `${aliasTrimmed}.html`,
        races: mergedRaces.length,
        generatedAt: new Date().toISOString(),
        carName: carName || existing?.carName,
        carIcon: carIcon || existing?.carIcon,
        raceData: mergedRaces,
        pointsSystem: existing?.pointsSystem,
      });

      addLog(
        "success",
        `Championship ${existing ? "updated" : "created"} successfully with ${mergedRaces.length} total race(s)`,
        faCheck,
      );

      // Clear input fields after successful creation/update
      setResultFiles([]);
      setServerEventFiles([]);
      setChampionshipAlias("");
      setParsedRaces([]);
      if (resultsInputRef.current) {
        resultsInputRef.current.value = "";
      }
      if (serverEventInputRef.current) {
        serverEventInputRef.current.value = "";
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog("error", errorMessage, faXmark);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Container fluid className="py-4">
      <Card bg="dark" text="white" className="border-secondary">
        <Card.Header as="h2" className="text-center page-header-gradient">
          <FontAwesomeIcon icon={faDatabase} className="me-2" />
          Build Results Database
        </Card.Header>
        <Card.Body className="p-4">
          <SectionTitle label="Step 1 · Download leaderboard icons" />
          <Row className="g-3 align-items-start">
            <Col lg={7}>
              <p className="text-white-50 mb-3">
                Downloads the leaderboard page from
                <Link
                  to="https://game.raceroom.com/leaderboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white ms-1"
                >
                  https://game.raceroom.com/leaderboard
                </Link>
                , parses it to collect the latest car and track icon URLs, and
                stores them for reuse. If the request is blocked by CORS, paste
                the page HTML below and run the analysis again.
              </p>
              <div className="d-flex gap-2 mb-3">
                <Button
                  variant="primary"
                  onClick={handleAssetsDownload}
                  disabled={isLoadingAssets}
                >
                  {isLoadingAssets ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Analyzing page...
                    </>
                  ) : (
                    "Download and analyze"
                  )}
                </Button>
                <Button
                  variant="warning"
                  onClick={() => {
                    setHtmlOverride("");
                    setAssets(null);
                    setAssetsError(null);
                    clearAssets();
                  }}
                  disabled={isLoadingAssets}
                >
                  Clear cache
                </Button>
              </div>
              <Form.Group className="mb-3" controlId="htmlOverride">
                <Form.Label className="text-white">
                  Manual HTML (optional)
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Paste the source HTML from https://game.raceroom.com/leaderboard if direct download is blocked"
                  value={htmlOverride}
                  onChange={(e) => setHtmlOverride(e.target.value)}
                />
              </Form.Group>
              {assetsError && (
                <Alert variant="danger" className="mb-3">
                  {assetsError}
                </Alert>
              )}
            </Col>
            <Col lg={5}>
              <Card bg="secondary" text="white" className="h-100">
                <Card.Body>
                  <Card.Title className="h6">Current status</Card.Title>
                  {assets ? (
                    <>
                      <div className="mb-2">
                        <small className="text-white-50">
                          Last updated:{" "}
                          {new Date(assets.fetchedAt).toLocaleString("en-US")}
                        </small>
                      </div>
                      <div className="mb-2">
                        <Badge
                          bg={cachedAssets ? "success" : "info"}
                          className="py-1 px-2"
                        >
                          {cachedAssets ? (
                            <>
                              <FontAwesomeIcon
                                icon={faDatabase}
                                className="me-2"
                              />
                              Cached
                            </>
                          ) : (
                            "Fresh"
                          )}
                        </Badge>
                      </div>
                      <div className="d-flex gap-3 mb-2">
                        <Badge bg="light" text="dark" className="py-2 px-3">
                          {assets.cars?.length ?? 0} cars
                        </Badge>
                        <Badge bg="light" text="dark" className="py-2 px-3">
                          {assets.tracks?.length ?? 0} tracks
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <p className="text-white-50 m-0">
                      No assets loaded. Start the download or paste the HTML.
                    </p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {assets && <AssetLists assets={assets} />}

          <hr className="my-4 border-secondary" />
          <SectionTitle label="Step 2 · Results source and alias" />
          <Row className="g-3">
            <Col lg={6}>
              <Form.Group controlId="resultsFiles" className="mb-3">
                <Form.Label className="text-white">
                  RaceRoom result files
                </Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  accept=".txt,.json"
                  ref={resultsInputRef}
                  onChange={onFilesSelected}
                />
                <Form.Text className="text-white-50">
                  Select one or more Race*.txt or Race*.json files (supports
                  Race1.txt, Race2.txt, etc.)
                </Form.Text>
              </Form.Group>
              <Alert variant="secondary" className="py-2 mb-3">
                {resultsSummary}
                {parsedRaces.length > 0 && (
                  <div className="mt-2">
                    <Badge bg="success" className="me-2">
                      {parsedRaces.length} race
                      {parsedRaces.length > 1 ? "s" : ""} parsed
                    </Badge>
                    {isParsingRaces && (
                      <Spinner animation="border" size="sm" className="ms-2" />
                    )}
                  </div>
                )}
              </Alert>
              <div className="text-center text-white-50 my-3">
                <small>── or ──</small>
              </div>
              <Form.Group controlId="serverEventFile" className="mb-3">
                <Form.Label className="text-white">
                  Server event file
                </Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  accept=".txt,.json"
                  ref={serverEventInputRef}
                  onChange={onServerEventFileSelected}
                />
                <Form.Text className="text-white-50">
                  Select one or more RaceRoom dedicated server event files. Imports Race result and Qualify times automatically.
                </Form.Text>
              </Form.Group>
              {serverEventFiles.length > 0 && (
                <Alert variant="secondary" className="py-2 mb-3">
                  {serverEventFiles.length} server event file
                  {serverEventFiles.length > 1 ? "s" : ""} selected
                  {parsedRaces.length > 0 && (
                    <div className="mt-2">
                      <Badge bg="success" className="me-2">
                        {parsedRaces.length} race{parsedRaces.length > 1 ? "s" : ""} parsed
                      </Badge>
                      {isParsingRaces && (
                        <Spinner animation="border" size="sm" className="ms-2" />
                      )}
                    </div>
                  )}
                </Alert>
              )}
              <div className="mt-3">
                <Form.Group controlId="restoreDatabase" className="mb-3">
                  <Form.Label className="text-white">
                    Or restore from backup
                  </Form.Label>
                  <Form.Control
                    type="file"
                    accept=".json"
                    ref={databaseInputRef}
                    onChange={handleRestoreDatabase}
                  />
                  <Form.Text className="text-white-50">
                    Upload a previously exported r3e-championships.json file to
                    restore your database.
                  </Form.Text>
                </Form.Group>
              </div>
            </Col>
            <Col lg={6}>
              <Form.Group controlId="championshipAlias" className="mb-3">
                <Form.Label className="text-white">
                  Championship alias
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. DTM Classic 2026"
                  value={championshipAlias}
                  onChange={(e) => setChampionshipAlias(e.target.value)}
                />
                <Form.Text className="text-white-50">
                  Used as the championship name and filename for downloads in
                  the viewer.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <hr className="my-4 border-secondary" />
          <SectionTitle label="Step 3 · Save to database" />
          <Row className="g-3">
            <Col lg={8}>
              <p className="text-white-50 mb-3">
                Save or update the championship in your local database using the
                selected RaceRoom result files and the provided alias. If a
                championship with the same alias already exists, new races will
                be merged without duplicating events on the same track and car
                class.
              </p>
            </Col>
            <Col lg={4}>
              <Button
                variant="success"
                size="lg"
                onClick={handleCreateOrUpdate}
                disabled={
                  parsedRaces.length === 0 || !championshipAlias || isProcessing
                }
                className="w-100"
              >
                {isProcessing ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Processing...
                  </>
                ) : (
                  "Create or update championship"
                )}
              </Button>
            </Col>
          </Row>
          {parsedRaces.length === 0 && (
            <Alert variant="info" className="mt-3">
              Select RaceRoom result files in Step 2 to continue.
            </Alert>
          )}
          {parsedRaces.length > 0 && !championshipAlias && (
            <Alert variant="info" className="mt-3">
              Enter a championship alias in Step 2 to enable saving.
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Restore Database Confirmation Modal */}
      <Modal
        show={showRestoreModal}
        onHide={() => setShowRestoreModal(false)}
        data-bs-theme="dark"
      >
        <Modal.Header closeButton className="bg-dark border-secondary">
          <Modal.Title>Restore Championship Database</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          <p className="text-danger">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            <strong>Warning:</strong> This action cannot be undone.
          </p>
          <p>
            You are about to restore your championship database from a backup
            file. This will:
          </p>
          <ul>
            <li>Replace all current championships with those in the backup</li>
            <li>Overwrite any championships with the same alias</li>
            <li>Not delete existing HTML files</li>
          </ul>
          <p className="text-white-50 mb-0">
            Make sure you have a backup of your current database before
            proceeding.
          </p>
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button
            variant="secondary"
            onClick={() => setShowRestoreModal(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmRestoreDatabase}>
            Restore Database
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default BuildResultsDatabase;
