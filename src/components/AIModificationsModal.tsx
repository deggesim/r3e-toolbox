import { Button, Modal } from "react-bootstrap";
import type { Assets } from "../types";

interface PlayerTimesModification {
  classId: string;
  className: string;
  trackId: string;
  trackName: string;
  removedCount: number;
}

interface AIModificationsModalProps {
  show: boolean;
  assets: Assets | null;
  selectedClassId: string;
  selectedTrackId: string;
  selectedAILevel: number | null;
  spacing: number;
  aifrom: number;
  aito: number;
  playerTimesModifications: PlayerTimesModification[];
  onHide: () => void;
  onConfirm: () => void;
}

const AIModificationsModal = ({
  show,
  assets,
  selectedClassId,
  selectedTrackId,
  selectedAILevel,
  spacing,
  aifrom,
  aito,
  playerTimesModifications,
  onHide,
  onConfirm,
}: AIModificationsModalProps) => {
  return (
    <Modal show={show} onHide={onHide} data-bs-theme="dark">
      <Modal.Header closeButton className="bg-dark border-secondary">
        <Modal.Title>Apply Modification</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-dark text-white">
        <p>You are about to apply the following modifications:</p>

        {selectedClassId && selectedTrackId && selectedAILevel !== null && (
          <>
            <h6 className="mt-3 mb-2">AI Generation:</h6>
            <ul>
              <li>
                <strong>Class:</strong>{" "}
                {assets?.classes?.[selectedClassId]?.name || selectedClassId}
              </li>
              <li>
                <strong>Track:</strong>{" "}
                {assets?.tracks?.[selectedTrackId]?.name || selectedTrackId}
              </li>
              <li>
                <strong>AI Range:</strong> {aifrom} - {aito} (step: {spacing})
              </li>
            </ul>
          </>
        )}

        {playerTimesModifications.length > 0 && (
          <>
            <h6 className="mt-3 mb-2">Player Times Removed:</h6>
            <ul className="mb-0">
              {playerTimesModifications.map((mod, idx) => (
                <li key={idx}>
                  <strong>{mod.className}</strong> - {mod.trackName}:{" "}
                  {mod.removedCount} time(s) removed
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="text-muted mt-3 mb-0">
          This will download the modified aiadaptation.xml file.
        </p>
      </Modal.Body>
      <Modal.Footer className="bg-dark border-secondary">
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Apply
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AIModificationsModal;
