import { Card, Table } from "react-bootstrap";
import type { PlayerTimes, TrackAsset } from "../types";
import { makeTime } from "../utils/timeUtils";

interface TracksProps {
  availableTracks: TrackAsset[];
  selectedClassId: string;
  selectedTrackId: string;
  playerTimes: PlayerTimes | null;
  onSelectTrack: (trackId: string) => void;
  onSelectAILevel: (aiLevel: number | null) => void;
}

const Tracks = ({
  availableTracks,
  selectedClassId,
  selectedTrackId,
  playerTimes,
  onSelectTrack,
  onSelectAILevel,
}: TracksProps) => {
  return (
    <Card bg="secondary" text="white" className="h-100">
      <Card.Header className="fw-semibold">Tracks</Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive" style={{ maxHeight: 320 }}>
          <Table hover size="sm" variant="dark" className="mb-0 align-middle">
            <thead className="table-dark position-sticky top-0">
              <tr>
                <th>Track</th>
                <th className="text-end">Player Best</th>
              </tr>
            </thead>
            <tbody>
              {availableTracks.map((track) => {
                const playerClass = playerTimes?.classes[selectedClassId];
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
                      selectedTrackId === track.id ? "table-active" : ""
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
  );
};

export default Tracks;
