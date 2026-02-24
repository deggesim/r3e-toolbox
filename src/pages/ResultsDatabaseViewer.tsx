import { faChartBar } from "@fortawesome/free-solid-svg-icons/faChartBar";
import { faDownload } from "@fortawesome/free-solid-svg-icons/faDownload";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons/faTrashCan";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import ChampionshipCard from "../components/ChampionshipCard";
import SectionTitle from "../components/SectionTitle";
import { useChampionshipStore } from "../store/championshipStore";
import { useGameDataStore } from "../store/gameDataStore";
import { useLeaderboardAssetsStore } from "../store/leaderboardAssetsStore";
import { useProcessingLogStore } from "../store/processingLogStore";
import type { ChampionshipEntry } from "../types";
import { convertAssetsForHTML } from "../utils/assetConverter";
import {
  downloadHTML,
  generateChampionshipIndexHTML,
  generateStandingsHTML,
} from "../utils/htmlGenerator";
import {
  getHumanDriverName,
  getSortedRaceSlots,
} from "../utils/humanPlayerUtils";
import { calculateChampionshipStandings } from "../utils/standingsCalculator";
import { parseTime, parseTimestring } from "../utils/timeUtils";

const ResultsDatabaseViewer = () => {
  const navigate = useNavigate();
  const championships = useChampionshipStore((state) => state.championships);
  const removeChampionship = useChampionshipStore((state) => state.remove);
  const renameChampionship = useChampionshipStore((state) => state.rename);
  const clearAll = useChampionshipStore((state) => state.clear);
  const leaderboardAssets = useLeaderboardAssetsStore((state) => state.assets);
  const gameData = useGameDataStore((state) => state.gameData);
  const addLog = useProcessingLogStore((state) => state.addLog);

  const [searchQuery, setSearchQuery] = useState("");
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  const handleCardClick = (alias: string) => {
    navigate(`/results-database/${encodeURIComponent(alias)}`);
  };

  const getHumanStats = () => {
    let wins = 0;
    let podiums = 0;
    let poles = 0;
    let championshipsWon = 0;

    for (const championship of championships) {
      const races = championship.raceData || [];
      if (races.length === 0) continue;

      let humanDriverName: string | null = null;

      for (const race of races) {
        const humanDriver = getHumanDriverName(race);
        if (humanDriver && !humanDriverName) {
          humanDriverName = humanDriver;
        }

        const sortedSlots = getSortedRaceSlots(race.slots || []);

        // Count race wins, podiums for human
        if (humanDriver) {
          const humanIndex = sortedSlots.findIndex(
            (slot) => slot.Driver === humanDriver,
          );
          if (humanIndex >= 0) {
            const position = humanIndex + 1;
            if (position === 1) wins += 1;
            if (position <= 3) podiums += 1;
          }
        }

        // Count poles for human
        if (humanDriver) {
          const qualifyingTimes = race.slots
            .map((slot) => ({
              driver: slot.Driver,
              time: parseTime(slot.QualTime),
            }))
            .filter((entry) => entry.time !== undefined) as Array<{
            driver: string;
            time: number;
          }>;

          if (qualifyingTimes.length > 0) {
            const bestTime = Math.min(...qualifyingTimes.map((q) => q.time));
            const humanQualTime = qualifyingTimes.find(
              (q) => q.driver === humanDriver,
            )?.time;
            if (humanQualTime !== undefined && humanQualTime === bestTime) {
              poles += 1;
            }
          }
        }
      }

      // Determine championship winner using utility function
      if (humanDriverName && races.length > 0) {
        const standings = calculateChampionshipStandings(races);
        if (standings.length > 0 && standings[0].driver === humanDriverName) {
          championshipsWon += 1;
        }
      }
    }

    return { wins, podiums, poles, championshipsWon };
  };

  const { wins, podiums, poles, championshipsWon } = getHumanStats();

  const filteredChampionships = championships
    .filter((championship) => {
      const query = searchQuery.toLowerCase();
      return (
        championship.alias.toLowerCase().includes(query) ||
        championship.carName?.toLowerCase().includes(query) ||
        championship.fileName.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const getFirstRaceDate = (champ: ChampionshipEntry): number => {
        if (!champ.raceData || champ.raceData.length === 0) {
          return new Date(champ.generatedAt).getTime();
        }

        const timestring = champ.raceData[0]?.timestring;
        const parsed = parseTimestring(timestring);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }

        return new Date(champ.generatedAt).getTime();
      };

      const dateA = getFirstRaceDate(a);
      const dateB = getFirstRaceDate(b);

      // Ordine cronologico (piu vecchi prima)
      return dateA - dateB;
    });

  const handleClearAll = () => {
    const count = championships.length;
    clearAll();
    setShowClearAllModal(false);
    addLog(
      "success",
      `All championships cleared (${count} removed)`,
      faTrashCan,
    );
  };

  const handleRemoveChampionship = (alias: string) => {
    removeChampionship(alias);
    addLog("success", `Championship "${alias}" removed`, faTrashCan);
  };

  const totalRaces = championships.reduce((sum, champ) => sum + champ.races, 0);

  const htmlAssets = convertAssetsForHTML(leaderboardAssets, true);

  const handleDownloadChampionship = (championship: ChampionshipEntry) => {
    if (!championship.raceData || championship.raceData.length === 0) {
      addLog(
        "error",
        "No race data stored for this championship. Create or update it first.",
        faXmark,
      );
      return;
    }

    const races = championship.raceData;
    const assetsForHTML = htmlAssets;
    const html = generateStandingsHTML(
      races,
      championship.alias,
      assetsForHTML,
      gameData,
    );

    downloadHTML(html, championship.fileName);
    addLog("success", `Downloaded ${championship.fileName}`);
  };

  const handleDownloadIndex = () => {
    if (championships.length === 0) {
      addLog(
        "warning",
        "No championships available to create index",
        faExclamationTriangle,
      );
      return;
    }
    const html = generateChampionshipIndexHTML(championships);
    downloadHTML(html, "index.html");
    addLog("success", "Downloaded index.html");
  };

  const handleDownloadDatabase = () => {
    if (championships.length === 0) {
      addLog("warning", "No championships to download", faExclamationTriangle);
      return;
    }

    const databaseJSON = JSON.stringify(championships, null, 2);
    const blob = new Blob([databaseJSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "r3e-championships.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    addLog("success", "Downloaded championship database");
  };

  return (
    <Container fluid className="py-4">
      <Card bg="dark" text="white" className="border-secondary">
        <Card.Header as="h2" className="text-center page-header-gradient">
          <FontAwesomeIcon icon={faChartBar} className="me-2" />
          Results Database Viewer
        </Card.Header>
        <Card.Body>
          <Card.Text className="text-white-50 mb-4">
            View and manage your saved championship results
          </Card.Text>

          {/* Stats Section */}
          {championships.length > 0 && (
            <Row className="g-3 mb-4">
              <Col md={4}>
                <Card className="bg-dark border-secondary">
                  <Card.Body className="text-center">
                    <div className="h2 text-primary mb-1">
                      {championships.length}
                    </div>
                    <div className="text-white-50 small">Championships</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="bg-dark border-secondary">
                  <Card.Body className="text-center">
                    <div className="h2 text-success mb-1">{totalRaces}</div>
                    <div className="text-white-50 small">Total Races</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="bg-dark border-secondary">
                  <Card.Body className="text-center">
                    <div className="h2 text-info mb-1">{wins}</div>
                    <div className="text-white-50 small">Wins</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="bg-dark border-secondary">
                  <Card.Body className="text-center">
                    <div className="h2 text-warning mb-1">{podiums}</div>
                    <div className="text-white-50 small">Podiums</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="bg-dark border-secondary">
                  <Card.Body className="text-center">
                    <div className="h2 text-secondary mb-1">{poles}</div>
                    <div className="text-white-50 small">Poles</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="bg-dark border-secondary">
                  <Card.Body className="text-center">
                    <div className="h2 text-danger mb-1">
                      {championshipsWon}
                    </div>
                    <div className="text-white-50 small">Championships Won</div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {/* Search and Actions */}
          <Card className="bg-dark border-secondary mb-4">
            <Card.Body>
              <Row className="g-3 align-items-center">
                <Col md={12}>
                  <Form.Group controlId="searchQuery">
                    <Form.Label className="text-white mb-1">Search</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Search championships by alias, car name, or filename..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Championships List */}
          {filteredChampionships.length === 0 ? (
            <Alert
              variant="info"
              className="bg-dark border-secondary text-white"
            >
              {championships.length === 0 ? (
                <>
                  <Alert.Heading>No Championships Yet</Alert.Heading>
                  <p className="mb-0">
                    Build your first championship using the "Build Results
                    Database" tool to see results here.
                  </p>
                </>
              ) : (
                <>
                  <Alert.Heading>No Results Found</Alert.Heading>
                  <p className="mb-0">
                    No championships match your search query. Try a different
                    search term.
                  </p>
                </>
              )}
            </Alert>
          ) : (
            <>
              <SectionTitle
                label={`Championships (${filteredChampionships.length})`}
              />
              <div className="d-flex justify-content-end gap-2 mb-3">
                <Button
                  onClick={handleDownloadDatabase}
                  disabled={championships.length === 0}
                  variant="secondary"
                >
                  <FontAwesomeIcon icon={faDownload} className="me-2" />
                  Download database
                </Button>
                <Button
                  onClick={handleDownloadIndex}
                  disabled={championships.length === 0}
                >
                  <FontAwesomeIcon icon={faDownload} className="me-2" />
                  Download index.html
                </Button>
              </div>
              <Row className="g-3">
                {filteredChampionships.map((championship) => (
                  <Col key={championship.alias} md={6} lg={4}>
                    <ChampionshipCard
                      championship={championship}
                      onDelete={handleRemoveChampionship}
                      onRename={renameChampionship}
                      onClick={handleCardClick}
                      onDownload={handleDownloadChampionship}
                    />
                  </Col>
                ))}
              </Row>
              <div className="mt-4 text-center">
                <Button
                  variant="danger"
                  onClick={() => setShowClearAllModal(true)}
                  disabled={championships.length === 0}
                >
                  <FontAwesomeIcon icon={faTrashCan} className="me-2" />
                  Clear All Championships
                </Button>
              </div>
            </>
          )}

          {/* Clear All Modal */}
          <Modal
            show={showClearAllModal}
            onHide={() => setShowClearAllModal(false)}
            centered
            data-bs-theme="dark"
          >
            <Modal.Header closeButton className="bg-dark border-secondary">
              <Modal.Title>Clear All Championships</Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-dark">
              <p className="text-white">
                Are you sure you want to clear <strong>all</strong>{" "}
                championships from the database?
              </p>
              <p className="text-white-50 small mb-0">
                This will remove all {championships.length} championship
                {championships.length === 1 ? "" : "s"} from the database. The
                generated HTML files will not be deleted.
              </p>
            </Modal.Body>
            <Modal.Footer className="bg-dark border-secondary">
              <Button
                variant="secondary"
                onClick={() => setShowClearAllModal(false)}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleClearAll}>
                Clear All
              </Button>
            </Modal.Footer>
          </Modal>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ResultsDatabaseViewer;
