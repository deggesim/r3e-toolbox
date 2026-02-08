import { Button, Card, Col, Form, Row } from "react-bootstrap";
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
  onSpacingChange: (spacing: number) => void;
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
  onSpacingChange,
  onApply,
  onRestorePlayerTimes,
}: AIModificationsProps) => {
  const cardText = () => {
    if (
      !selectedClassId ||
      !selectedTrackId ||
      (selectedAILevel === null && !hasModifiedPlayerTimes)
    ) {
      return <p>Select class, track, and AI level or modify player times</p>;
    }

    let aiText = <></>;
    if (selectedClassId && selectedTrackId && selectedAILevel !== null) {
      const className =
        assets?.classes[selectedClassId]?.name || selectedClassId;
      const trackName =
        assets?.tracks[selectedTrackId]?.name || selectedTrackId;
      aiText = (
        <p>{`${className} - ${trackName} : ${aifrom} - ${aito} (step: ${spacing})`}</p>
      );
    }

    let playerTimesText = <></>;
    if (hasModifiedPlayerTimes) {
      playerTimesText = <p>Player times modified</p>;
    }
    return (
      <>
        {aiText}
        {playerTimesText}
      </>
    );
  };

  return (
    <Card bg="dark" text="white" className="border-secondary">
      <Card.Body>
        <Card.Title className="h5">Modification</Card.Title>
        <Card.Text className="text-white-50">{cardText()}</Card.Text>

        <Row className="g-3 align-items-center">
          <Col md={4}>
            <Form.Group controlId="ai-step">
              <Form.Label>Step between AI levels (1-5)</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={5}
                step={1}
                value={spacing}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onSpacingChange(
                    Number.isFinite(val)
                      ? Math.min(5, Math.max(1, Math.floor(val)))
                      : 1,
                  );
                }}
              />
            </Form.Group>
          </Col>
          <Col md={8} className="d-flex justify-content-end gap-2">
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
