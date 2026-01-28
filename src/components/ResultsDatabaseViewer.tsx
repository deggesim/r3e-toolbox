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
import { useChampionshipStore } from "../store/championshipStore";
import type { ChampionshipEntry } from "../types";
import {
  downloadHTML,
  generateChampionshipIndexHTML,
  generateStandingsHTML,
} from "../utils/htmlGenerator";
import { useProcessingLog } from "../hooks/useProcessingLog";
import ProcessingLog from "./ProcessingLog";
import ChampionshipCard from "./ChampionshipCard";

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

export default function ResultsDatabaseViewer() {
  const navigate = useNavigate();
  const championships = useChampionshipStore((state) => state.championships);
  const removeChampionship = useChampionshipStore((state) => state.remove);
  const clearAll = useChampionshipStore((state) => state.clear);
  const { logs, addLog, logsEndRef, getLogVariant } = useProcessingLog();

  const [searchQuery, setSearchQuery] = useState("");
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  const handleCardClick = (alias: string) => {
    navigate(`/results-database/${encodeURIComponent(alias)}`);
  };

  const filteredChampionships = championships.filter((championship) => {
    const query = searchQuery.toLowerCase();
    return (
      championship.alias.toLowerCase().includes(query) ||
      championship.carName?.toLowerCase().includes(query) ||
      championship.fileName.toLowerCase().includes(query)
    );
  });

  const handleClearAll = () => {
    clearAll();
    setShowClearAllModal(false);
  };

  const totalRaces = championships.reduce((sum, champ) => sum + champ.races, 0);

  const handleDownloadChampionship = (championship: ChampionshipEntry) => {
    if (!championship.raceData || championship.raceData.length === 0) {
      addLog(
        "error",
        "❌ No race data stored for this championship. Create or update it first.",
      );
      return;
    }

    const races = championship.raceData;
    const html = generateStandingsHTML(races, championship.alias);

    downloadHTML(html, championship.fileName);
    addLog("success", `📥 Downloaded ${championship.fileName}`);
  };

  const handleDownloadIndex = () => {
    if (championships.length === 0) {
      addLog("warning", "⚠ No championships available to create index");
      return;
    }
    const html = generateChampionshipIndexHTML(championships);
    downloadHTML(html, "index.html");
    addLog("success", "📥 Downloaded index.html");
  };

  return (
    <Container className="py-4">
      <Card bg="dark" text="white" className="border-secondary">
        <Card.Header as="h2" className="text-center page-header-gradient">
          📊 Results Database Viewer
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
                    <div className="h2 text-info mb-1">
                      {championships.length > 0
                        ? Math.round(totalRaces / championships.length)
                        : 0}
                    </div>
                    <div className="text-white-50 small">
                      Avg. Races/Championship
                    </div>
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
                      className="bg-dark text-white border-secondary"
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
              <div className="d-flex justify-content-end mb-3">
                <Button
                  onClick={handleDownloadIndex}
                  disabled={championships.length === 0}
                >
                  Download index.html
                </Button>
              </div>
              <Row className="g-3">
                {filteredChampionships.map((championship) => (
                  <Col key={championship.alias} md={6} lg={4}>
                    <ChampionshipCard
                      championship={championship}
                      onDelete={removeChampionship}
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

          <ProcessingLog
            logs={logs}
            getLogVariant={getLogVariant}
            logsEndRef={logsEndRef}
          />
        </Card.Body>
      </Card>
    </Container>
  );
}
