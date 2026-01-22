import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  ListGroup,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import type { LeaderboardAssets, RaceRoomData } from "../types";
import type { ParsedRace } from "../types/raceResults";
import { fetchLeaderboardAssets } from "../utils/leaderboardAssets";
import { parseResultFiles } from "../utils/raceResultParser";

function SectionTitle({ label }: { readonly label: string }) {
  return (
    <div className="d-flex align-items-center gap-2 mb-3">
      <div
        style={{ width: 6, height: 28, background: "#646cff" }}
        aria-hidden
      />
      <h3 className="h5 m-0 text-uppercase text-white-50">{label}</h3>
    </div>
  );
}

function AssetListItem({
  item,
}: {
  readonly item: { id: string; name: string; iconUrl?: string };
}) {
  return (
    <ListGroup.Item className="bg-dark border-secondary d-flex gap-2 align-items-center py-2">
      {item.iconUrl ? (
        <img
          src={item.iconUrl}
          alt={item.name}
          style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 32,
            height: 32,
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
}

function AssetLists({ assets }: { readonly assets: LeaderboardAssets }) {
  return (
    <Row className="g-3 mt-2">
      <Col md={6}>
        <div className="mb-2">
          <strong className="text-white">
            Car Classes{" "}
            <Badge bg="light" text="dark" className="ms-1">
              {assets.classes.length}
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
            {assets.classes.length > 0 ? (
              assets.classes.map((item) => (
                <AssetListItem key={`class-${item.id}`} item={item} />
              ))
            ) : (
              <ListGroup.Item className="bg-dark border-secondary text-white-50 text-center py-3">
                No classes found
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
}

export default function BuildResultsDatabase() {
  const [assets, setAssets] = useState<LeaderboardAssets | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [htmlOverride, setHtmlOverride] = useState("");
  const [resultFiles, setResultFiles] = useState<File[]>([]);
  const [championshipAlias, setChampionshipAlias] = useState("");
  const [parsedRaces, setParsedRaces] = useState<ParsedRace[]>([]);
  const [isParsingRaces, setIsParsingRaces] = useState(false);
  const [gameData, setGameData] = useState<RaceRoomData | null>(null);

  const resultFolder = useMemo(() => {
    const first = resultFiles[0]?.webkitRelativePath;
    return first ? first.split("/")[0] : "";
  }, [resultFiles]);

  const resultsSummary = useMemo(() => {
    if (resultFiles.length === 0) return "No files selected";
    return (
      `${resultFiles.length} result file${resultFiles.length > 1 ? "s" : ""}` +
      (resultFolder ? ` from ${resultFolder}` : "")
    );
  }, [resultFiles.length, resultFolder]);

  // Load game data for parsing
  useEffect(() => {
    const loadGameData = async () => {
      try {
        const response = await fetch(
          new URL("../../r3e-data.json", import.meta.url).href,
        );
        const data: RaceRoomData = await response.json();
        setGameData(data);
      } catch (error) {
        console.error("Failed to load game data:", error);
      }
    };
    loadGameData();
  }, []);

  const handleAssetsDownload = useCallback(async () => {
    setIsLoadingAssets(true);
    setAssetsError(null);
    try {
      const data = await fetchLeaderboardAssets(
        htmlOverride.trim() ? { htmlOverride: htmlOverride.trim() } : undefined,
      );
      setAssets(data);
    } catch (error) {
      setAssets(null);
      setAssetsError(
        error instanceof Error ? error.message : "Error during download",
      );
    } finally {
      setIsLoadingAssets(false);
    }
  }, [htmlOverride]);

  const handleFolderChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files ? Array.from(event.target.files) : [];
      setResultFiles(files);

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
    },
    [gameData],
  );

  return (
    <Container className="py-4">
      <Card bg="dark" text="white" className="border-secondary">
        <Card.Header
          as="h2"
          className="text-center"
          style={{
            background: "linear-gradient(135deg, #646cff 0%, #535bf2 100%)",
            color: "white",
          }}
        >
          📊 Build Results Database
        </Card.Header>
        <Card.Body className="p-4">
          <SectionTitle label="Step 1 · Download leaderboard icons" />
          <Row className="g-3 align-items-start">
            <Col lg={7}>
              <p className="text-white-50 mb-3">
                We fetch car classes and tracks directly from
                https://game.raceroom.com/leaderboard to get the updated
                official icons. If the site&apos;s CORS blocks the request,
                paste the page HTML below and retry the analysis.
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
                  variant="outline-secondary"
                  onClick={() => {
                    setHtmlOverride("");
                    setAssets(null);
                    setAssetsError(null);
                  }}
                  disabled={isLoadingAssets}
                >
                  Reset
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
                      <div className="d-flex gap-3 mb-2">
                        <Badge bg="light" text="dark" className="py-2 px-3">
                          {assets.classes.length} classes
                        </Badge>
                        <Badge bg="light" text="dark" className="py-2 px-3">
                          {assets.tracks.length} tracks
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
              <Form.Group controlId="resultsFolder" className="mb-3">
                <Form.Label className="text-white">
                  RaceRoom results folder
                </Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  {...({ webkitdirectory: "" } as any)}
                  onChange={handleFolderChange}
                />
                <Form.Text className="text-white-50">
                  Suggested: UserData/Log/Results or dedicated exports.
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
                  Will be used to name the final archive and JSON files.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          {parsedRaces.length > 0 && (
            <Row className="mt-3">
              <Col>
                <Card bg="secondary" text="white">
                  <Card.Body>
                    <Card.Title className="h6 mb-3">
                      Parsed Races Preview
                    </Card.Title>
                    <div
                      style={{
                        maxHeight: "300px",
                        overflowY: "auto",
                      }}
                    >
                      <Table striped bordered hover variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Track</th>
                            <th>Drivers</th>
                            <th>Winner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedRaces.slice(0, 10).map((race) => (
                            <tr key={`${race.timestring}-${race.trackname}`}>
                              <td className="small">{race.timestring}</td>
                              <td className="small">{race.trackname}</td>
                              <td className="text-center">
                                {race.slots.length}
                              </td>
                              <td className="small">
                                {race.slots[0]?.Driver || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      {parsedRaces.length > 10 && (
                        <p className="text-center text-white-50 small mb-0">
                          ... and {parsedRaces.length - 10} more races
                        </p>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          <hr className="my-4 border-secondary" />
          <SectionTitle label="Step 3 · Archive export" />
          <p className="text-white-50 mb-0">
            In this step we will generate the HTML/JSON archive with standings
            and results database, replicating the logic of
            r3e-open-championship. It will be enabled after completing the
            previous steps.
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
}
