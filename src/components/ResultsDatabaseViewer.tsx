import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "react-bootstrap";
import { useChampionshipStore } from "../store/championshipStore";
import type { ChampionshipEntry } from "../types";

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

interface ChampionshipCardProps {
  readonly championship: ChampionshipEntry;
  readonly onDelete: (alias: string) => void;
  readonly onClick: (alias: string) => void;
}

function ChampionshipCard({ championship, onDelete, onClick }: ChampionshipCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(championship.alias);
    setShowDeleteModal(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleCardClick = () => {
    onClick(championship.alias);
  };

  const generatedDate = new Date(championship.generatedAt);
  const formattedDate = generatedDate.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <Card 
        className="bg-dark border-secondary h-100" 
        style={{ cursor: "pointer" }}
        onClick={handleCardClick}
      >
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div className="flex-grow-1 overflow-hidden">
              <Card.Title className="text-white mb-1 d-flex align-items-center gap-2">
                {championship.carIcon && (
                  <img
                    src={championship.carIcon}
                    alt={championship.carName || championship.alias}
                    style={{
                      width: 32,
                      height: 32,
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                )}
                <span className="text-truncate">{championship.alias}</span>
              </Card.Title>
              {championship.carName && (
                <Card.Subtitle className="text-white-50 small mb-2">
                  {championship.carName}
                </Card.Subtitle>
              )}
            </div>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleDeleteClick}
              title="Delete championship"
            >
              🗑️
            </Button>
          </div>

          <ListGroup variant="flush" className="border-0">
            <ListGroup.Item className="bg-dark border-secondary py-2 px-0">
              <div className="d-flex justify-content-between">
                <span className="text-white-50 small">Races:</span>
                <Badge bg="primary">{championship.races}</Badge>
              </div>
            </ListGroup.Item>
            <ListGroup.Item className="bg-dark border-secondary py-2 px-0">
              <div className="d-flex justify-content-between">
                <span className="text-white-50 small">Generated:</span>
                <span className="text-white small">{formattedDate}</span>
              </div>
            </ListGroup.Item>
            <ListGroup.Item className="bg-dark border-secondary py-2 px-0 border-bottom-0">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-white-50 small">HTML File:</span>
                <code
                  className="text-white small text-truncate"
                  style={{ maxWidth: "200px" }}
                  title={championship.fileName}
                >
                  {championship.fileName}
                </code>
              </div>
            </ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>

      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
        data-bs-theme="dark"
      >
        <Modal.Header closeButton className="bg-dark border-secondary">
          <Modal.Title>Delete Championship</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark">
          <p className="text-white">
            Are you sure you want to delete the championship{" "}
            <strong>{championship.alias}</strong>?
          </p>
          <p className="text-white-50 small mb-0">
            This will only remove it from the database. The generated HTML file
            will not be deleted.
          </p>
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default function ResultsDatabaseViewer() {
  const navigate = useNavigate();
  const championships = useChampionshipStore((state) => state.championships);
  const removeChampionship = useChampionshipStore((state) => state.remove);
  const clearAll = useChampionshipStore((state) => state.clear);

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

  const totalRaces = championships.reduce(
    (sum, champ) => sum + champ.races,
    0,
  );

  return (
    <Container fluid className="py-4">
      <div className="mb-4">
        <h2 className="h3 text-white mb-2">📊 Results Database Viewer</h2>
        <p className="text-white-50 mb-0">
          View and manage your saved championship results
        </p>
      </div>

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
                <div className="text-white-50 small">Avg. Races/Championship</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Search and Actions */}
      <Card className="bg-dark border-secondary mb-4">
        <Card.Body>
          <Row className="g-3 align-items-center">
            <Col md={8}>
              <Form.Group>
                <Form.Control
                  type="text"
                  placeholder="Search championships by alias, car name, or filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-dark text-white border-secondary"
                />
              </Form.Group>
            </Col>
            <Col md={4} className="text-md-end">
              <Button
                variant="outline-danger"
                onClick={() => setShowClearAllModal(true)}
                disabled={championships.length === 0}
              >
                Clear All Championships
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Championships List */}
      {filteredChampionships.length === 0 ? (
        <Alert variant="info" className="bg-dark border-secondary text-white">
          {championships.length === 0 ? (
            <>
              <Alert.Heading>No Championships Yet</Alert.Heading>
              <p className="mb-0">
                Build your first championship using the "Build Results Database"
                tool to see results here.
              </p>
            </>
          ) : (
            <>
              <Alert.Heading>No Results Found</Alert.Heading>
              <p className="mb-0">
                No championships match your search query. Try a different search
                term.
              </p>
            </>
          )}
        </Alert>
      ) : (
        <>
          <SectionTitle
            label={`Championships (${filteredChampionships.length})`}
          />
          <Row className="g-3">
            {filteredChampionships.map((championship) => (
              <Col key={championship.alias} md={6} lg={4} xl={3}>
                <ChampionshipCard
                  championship={championship}
                  onDelete={removeChampionship}
                  onClick={handleCardClick}
                />
              </Col>
            ))}
          </Row>
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
            Are you sure you want to clear <strong>all</strong> championships
            from the database?
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
    </Container>
  );
}
