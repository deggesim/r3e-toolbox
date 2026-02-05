import { Button, Card, Col, Form, Modal, Row, Table } from "react-bootstrap";
import type { Assets, PlayerTimes, ProcessedDatabase } from "../types";
import { makeTime } from "../utils/timeUtils";

interface AISelectionTableProps {
  assets: Assets | null;
  processed: ProcessedDatabase | null;
  playertimes: PlayerTimes | null;
  selectedClassId: string;
  selectedTrackId: string;
  selectedAILevel: number | null;
  spacing: number;
  onSelectClass: (classId: string) => void;
  onSelectTrack: (trackId: string) => void;
  onSelectAILevel: (aiLevel: number | null) => void;
  onSpacingChange: (spacing: number) => void;
  onRemoveGenerated: () => void;
  onResetAll: () => void;
  onApply: () => void;
  isApplyDisabled: boolean;
  aifrom: number;
  aito: number;
  showApplyModal: boolean;
  onHideApplyModal: () => void;
  onConfirmApply: () => void;
}

const AISelectionTable = ({
  assets,
  processed,
  playertimes,
  selectedClassId,
  selectedTrackId,
  selectedAILevel,
  spacing,
  onSelectClass,
  onSelectTrack,
  onSelectAILevel,
  onSpacingChange,
  onRemoveGenerated,
  onResetAll,
  onApply,
  isApplyDisabled,
  aifrom,
  aito,
  showApplyModal,
  onHideApplyModal,
  onConfirmApply,
}: AISelectionTableProps) => {
  // Calculate available classes and tracks
  const availableClasses =
    assets?.classesSorted.filter((classAsset) => {
      if (!processed || Object.keys(processed.classes).length === 0) {
        return true;
      }
      const classData = processed?.classes[classAsset.id];
      const playerClass = playertimes?.classes[classAsset.id];
      return classData || playerClass;
    }) || [];

  const availableTracks =
    assets?.tracksSorted.filter((trackAsset) => {
      if (!selectedClassId) return false;
      if (!processed || Object.keys(processed.classes).length === 0) {
        return true;
      }
      const classData = processed?.classes[selectedClassId];
      const track = classData?.tracks[trackAsset.id];
      const playerClass = playertimes?.classes[selectedClassId];
      const playerTrack = playerClass?.tracks[trackAsset.id];
      return track || playerTrack;
    }) || [];

  const aiLevels =
    selectedTrackId &&
    processed?.classes[selectedClassId]?.tracks[selectedTrackId]
      ? Object.entries(
          processed.classes[selectedClassId].tracks[selectedTrackId].ailevels,
        )
          .map(([ai, times]) => ({
            ai: Number(ai),
            time: times[0],
            num: times.length,
          }))
          .filter((x) => x.num > 0)
          .sort((a, b) => a.ai - b.ai)
      : [];

  if (!assets) {
    return (
      <Card bg="dark" text="white" className="border-secondary">
        <Card.Body>Please upload RaceRoom Data JSON file first.</Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card bg="dark" text="white" className="border-secondary">
        <Card.Body>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <Button variant="warning" onClick={onRemoveGenerated}>
              Remove likely generated
            </Button>
            <Button variant="danger" onClick={onResetAll}>
              Reset all AI times
            </Button>
          </div>

          <Row className="g-3 mb-4">
            <Col lg={4}>
              <Card bg="secondary" text="white" className="h-100">
                <Card.Header className="fw-semibold">Classes</Card.Header>
                <Card.Body className="p-0">
                  <div className="table-responsive" style={{ maxHeight: 320 }}>
                    <Table
                      hover
                      size="sm"
                      variant="dark"
                      className="mb-0 align-middle"
                    >
                      <thead className="table-dark position-sticky top-0">
                        <tr>
                          <th>Class</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableClasses.map((cls) => (
                          <tr
                            key={cls.id}
                            onClick={() => {
                              onSelectClass(cls.id);
                              onSelectTrack("");
                              onSelectAILevel(null);
                            }}
                            className={
                              selectedClassId === cls.id ? "table-active" : ""
                            }
                            style={{ cursor: "pointer" }}
                          >
                            <td>{cls.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={5}>
              <Card bg="secondary" text="white" className="h-100">
                <Card.Header className="fw-semibold">Tracks</Card.Header>
                <Card.Body className="p-0">
                  <div className="table-responsive" style={{ maxHeight: 320 }}>
                    <Table
                      hover
                      size="sm"
                      variant="dark"
                      className="mb-0 align-middle"
                    >
                      <thead className="table-dark position-sticky top-0">
                        <tr>
                          <th>Track</th>
                          <th className="text-end">Player Best</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableTracks.map((track) => {
                          const playerClass =
                            playertimes?.classes[selectedClassId];
                          const playerTrack = playerClass?.tracks[track.id];
                          const playerTime = playerTrack?.playertime
                            ? makeTime(playerTrack.playertime, ":")
                            : "";
                          return (
                            <tr
                              key={track.id}
                              onClick={() => {
                                onSelectTrack(track.id);
                                onSelectAILevel(null);
                              }}
                              className={
                                selectedTrackId === track.id
                                  ? "table-active"
                                  : ""
                              }
                              style={{ cursor: "pointer" }}
                            >
                              <td>{track.name}</td>
                              <td className="text-end">{playerTime}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={3}>
              <Card bg="secondary" text="white" className="h-100">
                <Card.Header className="fw-semibold">AI Levels</Card.Header>
                <Card.Body className="p-0">
                  <div className="table-responsive" style={{ maxHeight: 320 }}>
                    <Table
                      hover
                      size="sm"
                      variant="dark"
                      className="mb-0 align-middle"
                    >
                      <thead className="table-dark position-sticky top-0">
                        <tr>
                          <th>AI</th>
                          <th className="text-end">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiLevels.map(({ ai, time }) => (
                          <tr
                            key={ai}
                            onClick={() => onSelectAILevel(ai)}
                            className={
                              selectedAILevel === ai
                                ? "table-active fw-semibold"
                                : ""
                            }
                            style={{ cursor: "pointer" }}
                          >
                            <td>{ai}</td>
                            <td className="text-end">{makeTime(time, ":")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card bg="dark" text="white" className="border-secondary">
            <Card.Body>
              <Card.Title className="h5">Modification</Card.Title>
              <Card.Text className="text-white-50">
                {selectedClassId && selectedTrackId && selectedAILevel
                  ? `${assets.classes[selectedClassId].name} - ${assets.tracks[selectedTrackId].name} : ${aifrom} - ${aito} (step: ${spacing})`
                  : "Select class, track, and AI level"}
              </Card.Text>

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
                    variant="success"
                    onClick={onApply}
                    disabled={isApplyDisabled}
                  >
                    Apply Selected Modification
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Card.Body>
      </Card>

      {/* Apply Modification Confirmation Modal */}
      <Modal
        show={showApplyModal}
        onHide={onHideApplyModal}
        data-bs-theme="dark"
      >
        <Modal.Header closeButton className="bg-dark border-secondary">
          <Modal.Title>Apply Modification</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          {selectedClassId && selectedTrackId && (
            <>
              <p>You are about to apply the following modification:</p>
              <ul>
                <li>
                  <strong>Class:</strong> {assets.classes[selectedClassId].name}
                </li>
                <li>
                  <strong>Track:</strong> {assets.tracks[selectedTrackId].name}
                </li>
                <li>
                  <strong>AI Range:</strong> {aifrom} - {aito} (step: {spacing})
                </li>
              </ul>
              <p className="text-muted">
                This will download the modified aiadaptation.xml file.
              </p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={onHideApplyModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirmApply}>
            Apply
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AISelectionTable;
