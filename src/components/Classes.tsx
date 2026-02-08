import { Card, Table } from "react-bootstrap";
import type { ClassAsset } from "../types";

interface ClassesProps {
  availableClasses: ClassAsset[];
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
  onSelectTrack: (trackId: string) => void;
  onSelectAILevel: (aiLevel: number | null) => void;
}

const Classes = ({
  availableClasses,
  selectedClassId,
  onSelectClass,
  onSelectTrack,
  onSelectAILevel,
}: ClassesProps) => {
  return (
    <Card bg="secondary" text="white" className="h-100">
      <Card.Header className="fw-semibold">Classes</Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive" style={{ maxHeight: 320 }}>
          <Table hover size="sm" variant="dark" className="mb-0 align-middle">
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
                  className={selectedClassId === cls.id ? "table-active" : ""}
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
  );
};

export default Classes;
