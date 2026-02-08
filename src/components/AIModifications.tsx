import { Button, Card, Col, Row } from "react-bootstrap";
import type { Assets } from "../types";

interface AIModificationsProps {
  assets: Assets | null;
  selectedClassId: string;
  selectedTrackId: string;
  selectedAILevel: number | null;
  spacing: number;
  aifrom: number;
  aito: number;
  hasModifiedPlayerTimes: boolean;
  onApply: () => void;
  onRestorePlayerTimes: () => void;
}

const AIModifications = ({
  assets,
  selectedClassId,
  selectedTrackId,
  selectedAILevel,
  spacing,
  aifrom,
  aito,
  hasModifiedPlayerTimes,
  onApply,
  onRestorePlayerTimes,
}: AIModificationsProps) => {
  const cardText = () => {
    if (
      !selectedClassId ||
      !selectedTrackId ||
      (selectedAILevel === null && !hasModifiedPlayerTimes)
    ) {
      return (
        <span>Select class, track, and AI level or modify player times</span>
      );
    }

    let aiText = <></>;
    if (selectedClassId && selectedTrackId && selectedAILevel !== null) {
      const className =
        assets?.classes[selectedClassId]?.name || selectedClassId;
      const trackName =
        assets?.tracks[selectedTrackId]?.name || selectedTrackId;
      aiText = (
        <span>{`${className} - ${trackName} : ${aifrom} - ${aito} (step: ${spacing})`}</span>
      );
    }

    let playerTimesText = <></>;
    if (hasModifiedPlayerTimes) {
      playerTimesText = <span>Player times modified</span>;
    }
    return (
      <>
        {aiText}
        <br />
        {playerTimesText}
      </>
    );
  };

  return (
    <Card bg="dark" text="white" className="border-secondary">
      <Card.Body>
        <Card.Title className="h5">Modification</Card.Title>
        <Card.Text className="text-white-50">{cardText()}</Card.Text>

        <Row className="g-3">
          <Col className="d-flex justify-content-end gap-2">
            <Button
              variant="warning"
              onClick={onRestorePlayerTimes}
              disabled={!hasModifiedPlayerTimes}
            >
              Restore Original Player Times
            </Button>
            <Button
              variant="success"
              onClick={onApply}
              disabled={
                // Apply button is enabled if:
                // 1. User selected AI level for generation, OR
                // 2. User modified player times
                !hasModifiedPlayerTimes &&
                (!selectedClassId ||
                  !selectedTrackId ||
                  selectedAILevel === null)
              }
            >
              Apply Selected Modification
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default AIModifications;
