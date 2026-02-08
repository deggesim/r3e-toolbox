import { useState } from "react";
import { Button, Card, Modal, Table } from "react-bootstrap";
import type { PlayerTimes } from "../types";
import { makeTime } from "../utils/timeUtils";

interface PlayerTimesTableProps {
  playerTimes: PlayerTimes | null;
  selectedClassId: string;
  selectedTrackId: string;
  onDeleteTime: (timeIndex: number) => void;
  onDeleteAllButMin: () => void;
}

const PlayerTimesTable = ({
  playerTimes,
  selectedClassId,
  selectedTrackId,
  onDeleteTime,
  onDeleteAllButMin,
}: PlayerTimesTableProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  const playerClass = playerTimes?.classes[selectedClassId];
  const playerTrack = playerClass?.tracks[selectedTrackId];
  const times = playerTrack?.playertimes || [];
  const minTime = playerTrack?.playertime;

  const handleDeleteClick = (index: number) => {
    setDeleteIndex(index);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deleteIndex !== null) {
      onDeleteTime(deleteIndex);
    }
    setShowDeleteModal(false);
    setDeleteIndex(null);
  };

  const confirmDeleteAllButMin = () => {
    onDeleteAllButMin();
    setShowDeleteAllModal(false);
  };

  return (
    <>
      <Card bg="secondary" text="white" className="h-100">
        <Card.Header className="fw-semibold">
          Player Times {times.length > 0 && `(${times.length})`}
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive" style={{ maxHeight: 320 }}>
            <Table hover size="sm" variant="dark" className="mb-0 align-middle">
              <thead className="table-dark position-sticky top-0">
                <tr>
                  <th>Time</th>
                  <th className="text-center" style={{ width: "80px" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {times.map((time, index) => (
                  <tr
                    key={index}
                    className={time === minTime ? "table-success" : ""}
                  >
                    <td>
                      <strong>{makeTime(time, ":")}</strong>
                      {time === minTime && (
                        <span className="ms-2 badge bg-success">Best</span>
                      )}
                    </td>
                    <td className="text-center">
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleDeleteClick(index)}
                        disabled={time === minTime && times.length === 1}
                      >
                        ✕
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
        {times.length > 1 && (
          <Card.Footer className="bg-dark border-top border-secondary p-2 d-flex gap-2">
            <Button
              size="sm"
              variant="warning"
              onClick={() => setShowDeleteAllModal(true)}
              className="flex-grow-1"
            >
              Keep Best Only
            </Button>
          </Card.Footer>
        )}
      </Card>

      {/* Delete Single Time Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        data-bs-theme="dark"
      >
        <Modal.Header closeButton className="bg-dark border-secondary">
          <Modal.Title>Delete Lap Time</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          <p>
            Are you sure you want to delete this lap time:{" "}
            <strong>
              {deleteIndex !== null && makeTime(times[deleteIndex], ":")}
            </strong>
            ?
          </p>
          <p className="text-muted">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete All But Min Confirmation Modal */}
      <Modal
        show={showDeleteAllModal}
        onHide={() => setShowDeleteAllModal(false)}
        data-bs-theme="dark"
      >
        <Modal.Header closeButton className="bg-dark border-secondary">
          <Modal.Title>Delete All But Best Time</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          <p>
            You are about to delete <strong>{times.length - 1}</strong> lap
            time(s).
          </p>
          <p>Only the best time ({makeTime(minTime!, ":")}) will be kept.</p>
          <p className="text-muted">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button
            variant="secondary"
            onClick={() => setShowDeleteAllModal(false)}
          >
            Cancel
          </Button>
          <Button variant="warning" onClick={confirmDeleteAllButMin}>
            Keep Best Only
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PlayerTimesTable;
