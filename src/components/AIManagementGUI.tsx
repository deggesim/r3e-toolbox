import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Form, Modal, Row, Table } from "react-bootstrap";
import { useConfigStore } from "../store/configStore";
import type { Assets, PlayerTimes, ProcessedDatabase } from "../types";
import { computeTime, makeTime } from "../utils/timeUtils";

interface AIManagementGUIProps {
  assets: Assets | null;
  processed: ProcessedDatabase | null;
  playertimes: PlayerTimes | null;
  onApplyClick: (
    classid: string,
    trackid: string,
    aifrom: number,
    aito: number,
    aiSpacing: number,
  ) => void;
  onRemoveGenerated: () => void;
  onResetAll: () => void;
}

const AIManagementGUI: React.FC<AIManagementGUIProps> = ({
  assets,
  processed,
  playertimes,
  onApplyClick,
  onRemoveGenerated,
  onResetAll,
}) => {
  const { config } = useConfigStore();
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [selectedAILevel, setSelectedAILevel] = useState<number | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  const aiNumLevels = config.aiNumLevels;
  // User-defined spacing between AI levels (1-5), default 1
  const [spacing, setSpacing] = useState<number>(config.aiSpacing);

  useEffect(() => {
    setSpacing(config.aiSpacing);
  }, [config.aiSpacing]);

  const availableClasses = useMemo(
    () =>
      assets?.classesSorted.filter((classAsset) => {
        // Show all classes if no processed data, otherwise filter by available data
        if (!processed || Object.keys(processed.classes).length === 0) {
          return true; // Show all classes when no AI data is loaded
        }
        const classData = processed?.classes[classAsset.id];
        const playerClass = playertimes?.classes[classAsset.id];
        return classData || playerClass;
      }) || [],
    [assets, processed, playertimes],
  );

  const availableTracks = useMemo(
    () =>
      assets?.tracksSorted.filter((trackAsset) => {
        if (!selectedClassId) return false;
        // Show all tracks if no processed data, otherwise filter by available data
        if (!processed || Object.keys(processed.classes).length === 0) {
          return true; // Show all tracks when no AI data is loaded
        }
        const classData = processed?.classes[selectedClassId];
        const track = classData?.tracks[trackAsset.id];
        const playerClass = playertimes?.classes[selectedClassId];
        const playerTrack = playerClass?.tracks[trackAsset.id];
        return track || playerTrack;
      }) || [],
    [assets, processed, playertimes, selectedClassId],
  );

  useEffect(() => {
    if (availableClasses.length > 0) {
      // Check if current selectedClassId is still available
      const isCurrentAvailable = availableClasses.some(
        (cls) => cls.id === selectedClassId,
      );
      if (!isCurrentAvailable || !selectedClassId) {
        // Auto-select first available class
        setSelectedClassId(availableClasses[0].id);
      }
    } else {
      setSelectedClassId("");
    }
  }, [availableClasses, selectedClassId]);

  useEffect(() => {
    if (selectedClassId && availableTracks.length > 0) {
      // Check if current selectedTrackId is still available
      const isCurrentAvailable = availableTracks.some(
        (track) => track.id === selectedTrackId,
      );
      if (!isCurrentAvailable || !selectedTrackId) {
        // Auto-select first available track
        setSelectedTrackId(availableTracks[0].id);
      }
    } else {
      setSelectedTrackId("");
    }
  }, [selectedClassId, availableTracks, selectedTrackId]);

  const aiLevels = useMemo(() => {
    const levels: { ai: number; time: number; num: number }[] = [];
    if (
      selectedTrackId &&
      processed?.classes[selectedClassId]?.tracks[selectedTrackId]
    ) {
      const track = processed.classes[selectedClassId].tracks[selectedTrackId];
      for (let ai = track.minAI || 80; ai <= (track.maxAI || 120); ai++) {
        const [num, time] = computeTime(track.ailevels[ai] || []);
        if (num > 0) {
          levels.push({ ai, time, num });
        }
      }
    }
    return levels;
  }, [selectedTrackId, processed, selectedClassId]);

  const aifrom = selectedAILevel
    ? Math.max(
        config.minAI,
        selectedAILevel - Math.floor(aiNumLevels / 2) * spacing,
      )
    : config.minAI;
  const aito = Math.min(config.maxAI, aifrom + (aiNumLevels - 1) * spacing);

  const handleApply = () => {
    if (selectedClassId && selectedTrackId && selectedAILevel !== null) {
      setShowApplyModal(true);
    }
  };

  const confirmApply = () => {
    setShowApplyModal(false);
    if (selectedClassId && selectedTrackId && selectedAILevel !== null) {
      onApplyClick(selectedClassId, selectedTrackId, aifrom, aito, spacing);
    }
  };

  const isApplyDisabled =
    !selectedClassId || !selectedTrackId || selectedAILevel === null;

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
                              setSelectedClassId(cls.id);
                              setSelectedTrackId("");
                              setSelectedAILevel(null);
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
                                setSelectedTrackId(track.id);
                                setSelectedAILevel(null);
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
                            onClick={() => setSelectedAILevel(ai)}
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
                        setSpacing(
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
                    onClick={handleApply}
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
      <Modal show={showApplyModal} onHide={() => setShowApplyModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Apply Modification</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedClassId && selectedTrackId && (
            <>
              <p>You are about to apply the following modification:</p>
              <ul>
                <li>
                  <strong>Class:</strong>{" "}
                  {assets!.classes[selectedClassId].name}
                </li>
                <li>
                  <strong>Track:</strong> {assets!.tracks[selectedTrackId].name}
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
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApplyModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmApply}>
            Apply
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AIManagementGUI;
