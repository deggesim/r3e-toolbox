import { faDownload } from "@fortawesome/free-solid-svg-icons/faDownload";
import { faPencil } from "@fortawesome/free-solid-svg-icons/faPencil";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons/faTrashCan";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Form,
  ListGroup,
  Modal,
} from "react-bootstrap";
import type { ChampionshipEntry } from "../types";

interface ChampionshipCardProps {
  readonly championship: ChampionshipEntry;
  readonly onDelete: (alias: string) => void;
  readonly onRename: (oldAlias: string, newAlias: string) => boolean;
  readonly onClick: (alias: string) => void;
  readonly onDownload: (championship: ChampionshipEntry) => void;
}

const ChampionshipCard = ({
  championship,
  onDelete,
  onRename,
  onClick,
  onDownload,
}: ChampionshipCardProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newAlias, setNewAlias] = useState("");
  const [renameError, setRenameError] = useState("");

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation();
    onDelete(championship.alias);
    setShowDeleteModal(false);
  };

  const handleDeleteClick = (e: MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleRenameClick = (e: MouseEvent) => {
    e.stopPropagation();
    setNewAlias(championship.alias);
    setRenameError("");
    setShowRenameModal(true);
  };

  const handleRenameSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedAlias = newAlias.trim();

    if (!trimmedAlias) {
      setRenameError("Championship name cannot be empty");
      return;
    }

    if (trimmedAlias === championship.alias) {
      setShowRenameModal(false);
      return;
    }

    const success = onRename(championship.alias, trimmedAlias);

    if (success) {
      setShowRenameModal(false);
      setRenameError("");
    } else {
      setRenameError("A championship with this name already exists");
    }
  };

  const handleRenameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewAlias(e.target.value);
    setRenameError("");
  };

  const handleCardClick = () => {
    onClick(championship.alias);
  };

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
                <span
                  style={{
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {championship.alias}
                </span>
              </Card.Title>
              {championship.carName && (
                <Card.Subtitle className="text-white-50 small mb-2">
                  {championship.carIcon && (
                    <img
                      src={championship.carIcon}
                      alt={championship.carName || championship.alias}
                      style={{
                        objectFit: "contain",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {championship.carName}
                </Card.Subtitle>
              )}
            </div>
          </div>

          <ListGroup variant="flush" className="border-0">
            <ListGroup.Item className="bg-dark border-secondary py-2 px-0">
              <div className="d-flex justify-content-between">
                <span className="text-white-50 small">Races:</span>
                <Badge bg="primary">{championship.races}</Badge>
              </div>
            </ListGroup.Item>
            <ListGroup.Item className="bg-dark border-secondary py-2 px-0 border-bottom-0">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-white-50 small">HTML File:</span>
                <code
                  className="text-white small"
                  title={championship.fileName}
                >
                  {championship.fileName}
                </code>
              </div>
            </ListGroup.Item>
          </ListGroup>

          <div className="d-flex gap-2 mb-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRenameClick}
              title="Rename championship"
              className="text-nowrap px-2 flex-fill"
            >
              <FontAwesomeIcon icon={faPencil} className="me-2" />
              Rename
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteClick}
              title="Delete championship"
              className="text-nowrap px-2 flex-fill"
            >
              <FontAwesomeIcon icon={faTrashCan} className="me-2" />
              Remove
            </Button>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(championship);
            }}
            disabled={
              !championship.raceData || championship.raceData.length === 0
            }
            className="text-nowrap px-2 w-100"
          >
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Download as HTML
          </Button>
        </Card.Body>
      </Card>

      <Modal
        show={showRenameModal}
        onHide={() => setShowRenameModal(false)}
        centered
        data-bs-theme="dark"
      >
        <Modal.Header closeButton className="bg-dark border-secondary">
          <Modal.Title>Rename Championship</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRenameSubmit}>
          <Modal.Body className="bg-dark">
            <Form.Group controlId="newAlias">
              <Form.Label className="text-white">
                New Championship Name
              </Form.Label>
              <Form.Control
                type="text"
                value={newAlias}
                onChange={handleRenameChange}
                autoFocus
                placeholder="Enter new championship name"
              />
              <Form.Text className="text-white-50">
                The HTML filename will be automatically updated.
              </Form.Text>
            </Form.Group>
            {renameError && (
              <Alert variant="danger" className="mt-3 mb-0">
                {renameError}
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer className="bg-dark border-secondary">
            <Button
              variant="secondary"
              onClick={() => setShowRenameModal(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Rename
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

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
};

export default ChampionshipCard;
