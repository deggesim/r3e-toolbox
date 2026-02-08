import { Card, Form, Table } from "react-bootstrap";
import { makeTime } from "../utils/timeUtils";

interface AILevel {
  ai: number;
  time: number;
}

interface AILevelsProps {
  aiLevels: AILevel[];
  selectedAILevel: number | null;
  spacing: number;
  onSelectAILevel: (aiLevel: number) => void;
  onSpacingChange: (spacing: number) => void;
}

const AILevels = ({
  aiLevels,
  selectedAILevel,
  spacing,
  onSelectAILevel,
  onSpacingChange,
}: AILevelsProps) => {
  return (
    <Card bg="secondary" text="white" className="h-100">
      <Card.Header className="fw-semibold">AI Levels</Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive" style={{ maxHeight: 250 }}>
          <Table hover size="sm" variant="dark" className="mb-0 align-middle">
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
                    selectedAILevel === ai ? "table-active fw-semibold" : ""
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
      <Card.Footer className="bg-dark border-top border-secondary p-2 d-flex gap-2">
        <Form.Group controlId="ai-step">
          <Form.Label className="small mb-2">
            Step between AI levels (1-5)
          </Form.Label>
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
            size="sm"
          />
        </Form.Group>
      </Card.Footer>
    </Card>
  );
};

export default AILevels;
