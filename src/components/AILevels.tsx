import { Card, Table } from "react-bootstrap";
import { makeTime } from "../utils/timeUtils";

interface AILevel {
  ai: number;
  time: number;
}

interface AILevelsProps {
  aiLevels: AILevel[];
  selectedAILevel: number | null;
  onSelectAILevel: (aiLevel: number) => void;
}

const AILevels = ({
  aiLevels,
  selectedAILevel,
  onSelectAILevel,
}: AILevelsProps) => {
  return (
    <Card bg="secondary" text="white" className="h-100">
      <Card.Header className="fw-semibold">AI Levels</Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive" style={{ maxHeight: 320 }}>
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
    </Card>
  );
};

export default AILevels;
