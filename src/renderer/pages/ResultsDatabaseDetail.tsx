import { Fragment, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Alert, Button, Container, Form, Modal } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons/faDownload";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons/faPenToSquare";
import { faFloppyDisk } from "@fortawesome/free-solid-svg-icons/faFloppyDisk";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons/faRotateLeft";
import { faGavel } from "@fortawesome/free-solid-svg-icons/faGavel";
import { faStopwatch } from "@fortawesome/free-solid-svg-icons/faStopwatch";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { useChampionshipStore } from "../store/championshipStore";
import { useLeaderboardAssetsStore } from "../store/leaderboardAssetsStore";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { getDownloadLabel } from "../utils/platformLabels";
import { makeTime, parseTimestring } from "../utils/timeUtils";
import { getSortedRaceSlots } from "../utils/humanPlayerUtils";
import { generateStandingsHTML } from "../utils/htmlGenerator";
import { saveTextFile } from "../utils/fileSaver";
import "./ResultsDatabaseDetail.css";
import type { ParsedRace } from "../types/raceResults";
import {
  DEFAULT_POINTS_SYSTEM,
  resolvePointsSystem,
} from "../types/raceResults";
import {
  buildDriverStandings,
  buildTeamStandings,
  buildVehicleStandings,
} from "../utils/standingsCalculator";

interface BestTime {
  driver: string;
  vehicle: string;
  vehicleId?: number;
  isHuman: boolean;
  time: string;
  timeMs: number;
}

// Chronological order (oldest first); keeps original order when timestrings can't be parsed.
const byTimestring = (a: ParsedRace, b: ParsedRace): number => {
  const ta = parseTimestring(a.timestring);
  const tb = parseTimestring(b.timestring);
  return !Number.isNaN(ta) && !Number.isNaN(tb) ? ta - tb : 0;
};

const parseTime = (timeStr: string | undefined): number => {
  if (!timeStr) return Infinity;
  const parts = timeStr.split(":");
  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    return h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    return m * 60 + s;
  }
  return Infinity;
};

const formatTimeDiff = (baseMs: number, currentMs: number): string => {
  const diff = currentMs - baseMs;
  if (diff === 0) return "";
  const sign = diff > 0 ? "+ " : "- ";
  const absDiff = Math.abs(diff) / 1000;
  return `${sign}${absDiff.toFixed(3)}`;
};

const calculateGapFromWinner = (
  winner: { totalTime?: string; totalLaps?: number; timePenaltySeconds?: number },
  driver: { totalTime?: string; totalLaps?: number; timePenaltySeconds?: number },
): string => {
  if (!winner?.totalTime || !driver?.totalTime) return "-";

  const winnerLaps = winner.totalLaps ?? 0;
  const driverLaps = driver.totalLaps ?? 0;
  const lapDiff = winnerLaps - driverLaps;

  // Effective race time includes any time penalty (in seconds).
  const winnerTime =
    parseTime(winner.totalTime) + (winner.timePenaltySeconds ?? 0);
  const driverTime =
    parseTime(driver.totalTime) + (driver.timePenaltySeconds ?? 0);
  const timeDiff = driverTime - winnerTime;

  if (lapDiff > 0) {
    // Driver is lapped: show only lap count, no time gap
    return `+${lapDiff} lap${lapDiff > 1 ? "s" : ""}`;
  } else {
    // Same laps, show time difference
    const sign = timeDiff >= 0 ? "+" : "-";
    return `${sign}${Math.abs(timeDiff).toFixed(3)}`;
  }
};

const getBestLapTimesPerRace = (races: ParsedRace[]): BestTime[][] => {
  return races.map((race) => {
    const raceLapTimes: BestTime[] = [];
    const humanDriver =
      race.slots && race.slots.length > 0 ? race.slots[0].driver : null;

    race.slots.forEach((slot) => {
      if (slot.bestLap) {
        const timeMs = parseTime(slot.bestLap) * 1000;
        if (Number.isFinite(timeMs) && timeMs > 0) {
          raceLapTimes.push({
            driver: slot.driver,
            vehicle: slot.vehicle,
            vehicleId: slot.vehicleId,
            isHuman: slot.driver === humanDriver,
            time: makeTime(parseTime(slot.bestLap)),
            timeMs,
          });
        }
      }
    });

    const sorted = [...raceLapTimes].sort(
      (a: BestTime, b: BestTime) => a.timeMs - b.timeMs,
    );
    return sorted;
  });
};

const getBestQualifyingTimesPerRace = (races: ParsedRace[]): BestTime[][] => {
  return races.map((race) => {
    const raceQualTimes: BestTime[] = [];
    const humanDriver =
      race.slots && race.slots.length > 0 ? race.slots[0].driver : null;

    race.slots.forEach((slot) => {
      if (slot.qualTime) {
        const timeMs = parseTime(slot.qualTime) * 1000;
        if (Number.isFinite(timeMs) && timeMs > 0) {
          raceQualTimes.push({
            driver: slot.driver,
            vehicle: slot.vehicle,
            vehicleId: slot.vehicleId,
            isHuman: slot.driver === humanDriver,
            time: makeTime(parseTime(slot.qualTime)),
            timeMs,
          });
        }
      }
    });

    const sorted = [...raceQualTimes].sort(
      (a: BestTime, b: BestTime) => a.timeMs - b.timeMs,
    );
    return sorted;
  });
};

// Parse a penalty input string; empty/zero/invalid clears the penalty (returns undefined).
const parsePenaltyValue = (value: string): number | undefined => {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const parsePointsInput = (input: string): number[] | null => {
  const parts = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const nums = parts.map(Number);
  return nums.some((n) => !Number.isFinite(n) || n < 0) ? null : nums;
};

type PointsPenaltyModalProps = {
  drivers: string[];
  penalties: Record<string, number>;
  onSave: (driver: string, value: number | undefined) => void;
  onHide: () => void;
};

// Input state lives here (not in the parent) so typing doesn't re-render the heavy detail page.
const PointsPenaltyModal = ({
  drivers,
  penalties,
  onSave,
  onHide,
}: PointsPenaltyModalProps) => {
  const valueOf = (driver: string) =>
    penalties[driver] != null ? String(penalties[driver]) : "";

  const [driver, setDriver] = useState(drivers[0] ?? "");
  const [value, setValue] = useState(() => valueOf(drivers[0] ?? ""));

  const selectDriver = (d: string) => {
    setDriver(d);
    setValue(valueOf(d));
  };

  return (
    <Modal show onHide={onHide} centered contentClassName="penalty-modal">
      <Modal.Header closeButton>
        <Modal.Title>Manage points penalties</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3" controlId="pointsPenaltyDriver">
          <Form.Label>Driver</Form.Label>
          <Form.Select
            value={driver}
            onChange={(e) => selectDriver(e.target.value)}
          >
            {drivers.map((d) => (
              <option key={`pp-driver-${d}`} value={d}>
                {d}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group controlId="pointsPenaltyValue">
          <Form.Label>Points penalty</Form.Label>
          <Form.Control
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="success"
          onClick={() => onSave(driver, parsePenaltyValue(value))}
          disabled={!driver}
        >
          <FontAwesomeIcon icon={faFloppyDisk} className="me-2" />
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

type SecondsPenaltyModalProps = {
  races: ParsedRace[];
  onSave: (raceIdx: number, driver: string, value: number | undefined) => void;
  onHide: () => void;
};

// Input state lives here (not in the parent) so typing doesn't re-render the heavy detail page.
const SecondsPenaltyModal = ({
  races,
  onSave,
  onHide,
}: SecondsPenaltyModalProps) => {
  const firstDriverOf = (idx: number) =>
    getSortedRaceSlots(races[idx]?.slots ?? [])[0]?.driver ?? "";
  const valueOf = (idx: number, driver: string) => {
    const slot = races[idx]?.slots.find((s) => s.driver === driver);
    return slot?.timePenaltySeconds != null
      ? String(slot.timePenaltySeconds)
      : "";
  };

  const [raceIdx, setRaceIdx] = useState(0);
  const [driver, setDriver] = useState(() => firstDriverOf(0));
  const [value, setValue] = useState(() => valueOf(0, firstDriverOf(0)));

  const selectRace = (idx: number) => {
    const first = firstDriverOf(idx);
    setRaceIdx(idx);
    setDriver(first);
    setValue(valueOf(idx, first));
  };

  const selectDriver = (d: string) => {
    setDriver(d);
    setValue(valueOf(raceIdx, d));
  };

  return (
    <Modal show onHide={onHide} centered contentClassName="penalty-modal">
      <Modal.Header closeButton>
        <Modal.Title>Manage seconds penalties</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3" controlId="penaltyRace">
          <Form.Label>Race</Form.Label>
          <Form.Select
            value={raceIdx}
            onChange={(e) => selectRace(Number(e.target.value))}
          >
            {races.map((race, idx) => (
              <option key={`pen-race-${idx}`} value={idx}>
                {race.trackname || "Unknown Track"}
                {race.timestring ? ` — ${race.timestring}` : ""}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3" controlId="penaltyDriver">
          <Form.Label>Driver</Form.Label>
          <Form.Select
            value={driver}
            onChange={(e) => selectDriver(e.target.value)}
          >
            {getSortedRaceSlots(races[raceIdx]?.slots ?? []).map((slot) => (
              <option key={`pen-driver-${slot.driver}`} value={slot.driver}>
                {slot.driver}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group controlId="penaltyTime">
          <Form.Label>Time penalty (s)</Form.Label>
          <Form.Control
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="success"
          onClick={() => onSave(raceIdx, driver, parsePenaltyValue(value))}
          disabled={!driver}
        >
          <FontAwesomeIcon icon={faFloppyDisk} className="me-2" />
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

type PointsSystemEditorProps = {
  pointsSystem: number[];
  onSave: (parsed: number[]) => void;
};

// Editor + input state live here so typing doesn't re-render the heavy detail page.
const PointsSystemEditor = ({
  pointsSystem,
  onSave,
}: PointsSystemEditorProps) => {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");

  const startEdit = () => {
    setInput(pointsSystem.join(", "));
    setEditing(true);
  };

  const save = () => {
    const parsed = parsePointsInput(input);
    if (!parsed) return;
    onSave(parsed);
    setEditing(false);
  };

  const invalid = parsePointsInput(input) === null;

  return (
    <div className="points-system mt-3">
      {!editing ? (
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="points-system-label">Points system:</span>
          <span className="points-system-value">{pointsSystem.join(", ")}</span>
          <Button
            variant="link"
            size="sm"
            className="points-edit-btn p-0"
            aria-label="Edit points system"
            onClick={startEdit}
          >
            <FontAwesomeIcon icon={faPenToSquare} />
          </Button>
        </div>
      ) : (
        <div className="d-flex align-items-start gap-2 flex-wrap">
          <Form.Group
            controlId="pointsSystemInput"
            className="flex-fill"
            style={{ minWidth: 240 }}
          >
            <Form.Label className="points-system-label">
              Points system
            </Form.Label>
            <Form.Control
              type="text"
              value={input}
              isInvalid={invalid}
              onChange={(e) => setInput(e.target.value)}
              placeholder="25, 18, 15, 12, 10, 8, 6, 4, 2, 1"
            />
            <div className="mt-2 d-flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline-light"
                onClick={() =>
                  setInput(DEFAULT_POINTS_SYSTEM.default.join(", "))
                }
              >
                F1
              </Button>
              <Button
                size="sm"
                variant="outline-light"
                onClick={() =>
                  setInput(DEFAULT_POINTS_SYSTEM.dtm2023.join(", "))
                }
              >
                DTM
              </Button>
            </div>
          </Form.Group>
          <div className="d-flex gap-2 points-edit-actions">
            <Button
              variant="success"
              size="sm"
              onClick={save}
              disabled={invalid}
              aria-label="Save points system"
            >
              <FontAwesomeIcon icon={faFloppyDisk} />
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setEditing(false)}
              aria-label="Cancel"
            >
              <FontAwesomeIcon icon={faRotateLeft} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const ResultsDatabaseDetail = () => {
  const electronAPI = useElectronAPI();
  const { isElectron } = electronAPI;
  const { alias } = useParams<{ alias: string }>();
  const navigate = useNavigate();
  const championships = useChampionshipStore((state) => state.championships);
  const addOrUpdate = useChampionshipStore((state) => state.addOrUpdate);
  const leaderboardAssets = useLeaderboardAssetsStore((state) => state.assets);

  // Penalty modals: "seconds" = per-race time penalty, "points" = season points penalty.
  // Each modal owns its input state (separate component) so typing doesn't re-render this page.
  const [penaltyModal, setPenaltyModal] = useState<null | "seconds" | "points">(
    null,
  );
  // Confirmation modal for clearing every penalty (points + seconds).
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const championship = championships.find((c) => c.alias === alias);

  // Chronologically-sorted races (single source for every table).
  const races: ParsedRace[] = championship?.raceData
    ? [...championship.raceData].sort(byTimestring)
    : [];
  const pointsSystem = championship
    ? resolvePointsSystem(championship)
    : DEFAULT_POINTS_SYSTEM.default;

  const driverStandings = buildDriverStandings(
    races,
    pointsSystem,
    championship?.pointsPenalties,
  );
  const teamStandings = buildTeamStandings(races, pointsSystem);
  const vehicleStandings = buildVehicleStandings(races, pointsSystem);
  const bestLapTimes = getBestLapTimesPerRace(races);
  const bestQualTimes = getBestQualifyingTimesPerRace(races);
  const raceHeaders = races.map((r) => ({
    name: r.trackname || "Unknown Track",
    time: r.timestring || "",
  }));

  const getVehicleIcon = (vehicleId?: number) => {
    if (vehicleId === undefined || !leaderboardAssets) return null;
    const vehicleIdStr = String(vehicleId);
    const icon = leaderboardAssets.cars.find(
      (c) => c.id === vehicleIdStr,
    )?.iconUrl;
    return icon || null;
  };

  const getTrackIcon = (trackName: string) => {
    if (!trackName || !leaderboardAssets) return null;
    const icon = leaderboardAssets.tracks.find(
      (t) => t.name === trackName,
    )?.iconUrl;
    return icon || null;
  };

  const getVehicleName = (vehicleId?: number, vehicleName?: string): string => {
    const vehicleIdStr =
      vehicleId !== undefined ? String(vehicleId) : undefined;
    if (vehicleName && vehicleName !== vehicleIdStr) return vehicleName;
    if (vehicleId === undefined) return vehicleName || "";
    // Try to get the name from leaderboard assets
    if (leaderboardAssets) {
      const classData = leaderboardAssets.cars.find(
        (c) => c.id === vehicleIdStr,
      );
      if (classData?.name) {
        return classData.name;
      }
    }
    return vehicleName || vehicleIdStr || "";
  };

  // --- Penalty save handlers (input state lives in the modal components) ----

  const saveSeconds = (
    raceIdx: number,
    driver: string,
    value: number | undefined,
  ) => {
    if (!championship?.raceData) return;
    // Clone, sort identically to the UI, then mutate the selected slot in place.
    const cloned = structuredClone(championship.raceData);
    const sorted = [...cloned].sort(byTimestring);
    const slot = sorted[raceIdx]?.slots.find((s) => s.driver === driver);
    if (slot) slot.timePenaltySeconds = value;
    addOrUpdate({ ...championship, raceData: cloned });
    setPenaltyModal(null);
  };

  const savePointsPenalty = (driver: string, value: number | undefined) => {
    if (!championship) return;
    const next: Record<string, number> = { ...championship.pointsPenalties };
    if (value === undefined) delete next[driver];
    else next[driver] = value;
    addOrUpdate({
      ...championship,
      pointsPenalties: Object.keys(next).length > 0 ? next : undefined,
    });
    setPenaltyModal(null);
  };

  // --- Reset all penalties (points + seconds) ------------------------------

  const hasAnyPenalty =
    Object.keys(championship?.pointsPenalties ?? {}).length > 0 ||
    races.some((r) => r.slots.some((s) => s.timePenaltySeconds != null));

  const resetAllPenalties = () => {
    if (!championship) return;
    const cloned = structuredClone(championship.raceData ?? []);
    cloned.forEach((race) =>
      race.slots.forEach((slot) => delete slot.timePenaltySeconds),
    );
    addOrUpdate({ ...championship, raceData: cloned, pointsPenalties: undefined });
    setShowResetConfirm(false);
  };

  if (!championship) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Championship Not Found</Alert.Heading>
          <p>The championship "{alias}" was not found in the database.</p>
          <Button
            variant="outline-danger"
            onClick={() => navigate("/results-database")}
          >
            Back to Database
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!championship.raceData || championship.raceData.length === 0) {
    return (
      <Container fluid className="py-4">
        <Alert variant="warning">
          <Alert.Heading>No Race Data Available</Alert.Heading>
          <p>
            This championship was created before race data storage was
            implemented.
          </p>
          <Button
            variant="outline-warning"
            onClick={() => navigate("/results-database")}
          >
            Back to Database
          </Button>
        </Alert>
      </Container>
    );
  }

  const generatedDate = new Date(championship.generatedAt);
  const day = String(generatedDate.getDate()).padStart(2, "0");
  const month = String(generatedDate.getMonth() + 1).padStart(2, "0");
  const year = generatedDate.getFullYear();
  const hours = String(generatedDate.getHours()).padStart(2, "0");
  const minutes = String(generatedDate.getMinutes()).padStart(2, "0");
  const seconds = String(generatedDate.getSeconds()).padStart(2, "0");
  const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

  const getPositionClass = (pos: number) => {
    if (pos === 1) return "pos1";
    if (pos === 2) return "pos2";
    if (pos === 3) return "pos3";
    return "";
  };

  const handleDownloadHTML = async () => {
    const leaderboardAssetsForExport = leaderboardAssets
      ? {
          cars: Object.fromEntries(
            leaderboardAssets.cars.map((c) => [c.id, c.iconUrl || ""]),
          ),
          tracks: Object.fromEntries(
            leaderboardAssets.tracks.map((t) => [t.name, t.iconUrl || ""]),
          ),
          carNames: Object.fromEntries(
            leaderboardAssets.cars.map((c) => [c.id, c.name]),
          ),
        }
      : undefined;

    const html = generateStandingsHTML(
      championship.raceData!,
      championship.alias,
      leaderboardAssetsForExport,
      undefined,
      undefined,
      resolvePointsSystem(championship),
      championship.pointsPenalties,
    );
    await saveTextFile({
      electronAPI,
      filename: `${championship.alias}.html`,
      content: html,
      mimeType: "text/html",
      filters: [
        { name: "HTML Files", extensions: ["html"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
  };

  return (
    <Container fluid className="py-4">
      <Button
        onClick={() => navigate("/results-database")}
        className="back-button"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
        Back to Database
      </Button>

      <div className="results-header">
        <div className="d-flex align-items-center gap-3 mb-2">
          {championship.carIcon && (
            <img
              src={championship.carIcon}
              alt={championship.carName || championship.alias}
              style={{ objectFit: "contain" }}
            />
          )}
          <h1 className="results-title mb-0">{championship.alias}</h1>
        </div>
        <p className="results-subtitle">
          {championship.carName && <span>{championship.carName} • </span>}
          <span>Championship Standings</span>
        </p>
        <p className="results-subtitle mb-0">
          Generated from R3E Toolbox • {formattedDate}
        </p>

        <div className="mt-3 d-flex flex-wrap gap-2 align-items-center">
          <Button variant="primary" size="sm" onClick={handleDownloadHTML}>
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            {getDownloadLabel(isElectron)} as HTML
          </Button>
          <Button
            variant="outline-light"
            size="sm"
            onClick={() => setPenaltyModal("points")}
          >
            <FontAwesomeIcon icon={faGavel} className="me-2" />
            Manage points penalties
          </Button>
          <Button
            variant="outline-light"
            size="sm"
            onClick={() => setPenaltyModal("seconds")}
          >
            <FontAwesomeIcon icon={faStopwatch} className="me-2" />
            Manage seconds penalties
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => setShowResetConfirm(true)}
            disabled={!hasAnyPenalty}
          >
            <FontAwesomeIcon icon={faEraser} className="me-2" />
            Reset all penalties
          </Button>
        </div>

        {/* Points system summary with pencil-toggle editor */}
        <PointsSystemEditor
          pointsSystem={pointsSystem}
          onSave={(parsed) =>
            addOrUpdate({ ...championship, pointsSystem: parsed })
          }
        />
      </div>

      {/* Driver Standings */}
      <div className="results-table-wrapper">
        <table className="results-table">
          <caption>Driver Standings</caption>
          <thead>
            <tr>
              <th rowSpan={2}>Pos</th>
              <th rowSpan={2}>Driver</th>
              <th rowSpan={2}>Vehicle</th>
              <th rowSpan={2}>Team</th>
              <th rowSpan={2}>Points</th>
              {raceHeaders.map((header, idx) => {
                const trackIcon = getTrackIcon(header.name);
                return (
                  <th
                    key={`race-${idx}-${header.name}`}
                    colSpan={2}
                    className="track-header"
                  >
                    {trackIcon && <img src={trackIcon} alt={header.name} />}
                    <div>{header.name}</div>
                    {header.time && (
                      <span className="track-time">{header.time}</span>
                    )}
                  </th>
                );
              })}
            </tr>
            <tr>
              {raceHeaders.map((header, idx) => (
                <Fragment key={`header-${idx}-${header.name}`}>
                  <th>Pts</th>
                  <th>Pos</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {driverStandings.map((standing) => {
              const vehicleIcon = getVehicleIcon(standing.vehicleId);
              const vehicleName = getVehicleName(
                standing.vehicleId,
                standing.vehicle,
              );
              return (
                <tr
                  key={standing.driver}
                  className={standing.isHuman ? "human-driver" : ""}
                >
                  <td>{standing.position}</td>
                  <td className="driver-name-cell">
                    {standing.driver}
                    {standing.pointsPenalty > 0 && (
                      <span className="points-penalty-badge">
                        -{standing.pointsPenalty}p
                      </span>
                    )}
                  </td>
                  <td>
                    {vehicleIcon && (
                      <img
                        src={vehicleIcon}
                        className="vehicle-icon"
                        alt={vehicleName}
                      />
                    )}
                    {vehicleName}
                  </td>
                  <td>{standing.team}</td>
                  <td className="points-cell">{standing.points}</td>
                  {raceHeaders.map((_, idx) => {
                    const pts = standing.racePoints[idx];
                    const result = standing.raceResults[idx];
                    const posClass =
                      result !== null && result <= 3
                        ? getPositionClass(result)
                        : "";
                    return (
                      <Fragment key={`race-${standing.driver}-${idx}`}>
                        <td className="points-cell">{pts ?? "-"}</td>
                        <td className={posClass}>{result ?? "-"}</td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Team Standings */}
      {teamStandings.length > 1 && (
        <div className="results-table-wrapper">
          <table className="results-table">
            <caption>Team Standings</caption>
            <thead>
              <tr>
                <th rowSpan={2}>Pos</th>
                <th rowSpan={2}>Team</th>
                <th rowSpan={2}>Entries</th>
                <th rowSpan={2}>Points</th>
                {raceHeaders.map((header, idx) => (
                  <th key={`team-race-${header.name}-${idx}`}>
                    {header.name}
                    {header.time && (
                      <span className="track-time">{header.time}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamStandings.map((standing) => (
                <tr key={standing.team}>
                  <td>{standing.position}</td>
                  <td>{standing.team}</td>
                  <td>{standing.entries}</td>
                  <td className="points-cell">{standing.points}</td>
                  {standing.racePoints.map((pts, idx) => (
                    <td
                      key={`team-pts-${standing.team}-${idx}`}
                      className="points-cell"
                    >
                      {pts ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vehicle Standings */}
      <div className="results-table-wrapper">
        <table className="results-table">
          <caption>Vehicle Standings</caption>
          <thead>
            <tr>
              <th rowSpan={2}>Pos</th>
              <th rowSpan={2}>Vehicle</th>
              <th rowSpan={2}>Entries</th>
              <th rowSpan={2}>Points</th>
              {raceHeaders.map((header, idx) => (
                <th key={`vehicle-race-${header.name}-${idx}`}>
                  {header.name}
                  {header.time && (
                    <span className="track-time">{header.time}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicleStandings.map((standing) => {
              const vehicleIcon = getVehicleIcon(standing.vehicleId);
              const vehicleName = getVehicleName(
                standing.vehicleId,
                standing.vehicle,
              );
              return (
                <tr key={standing.vehicle}>
                  <td>{standing.position}</td>
                  <td>
                    {vehicleIcon && (
                      <img
                        src={vehicleIcon}
                        className="vehicle-icon"
                        alt={vehicleName}
                      />
                    )}
                    {vehicleName}
                  </td>
                  <td>{standing.entries}</td>
                  <td className="points-cell">{standing.points}</td>
                  {standing.racePoints.map((pts, idx) => (
                    <td
                      key={`vehicle-pts-${standing.vehicle}-${idx}`}
                      className="points-cell"
                    >
                      {pts ?? "-"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Race Results */}
      <div className="results-table-wrapper">
        <table className="results-table">
          <caption>Race Results</caption>
          <thead>
            <tr>
              <th>Pos</th>
              {raceHeaders.map((header) => (
                <th
                  key={`race-result-${header.name}-${header.time}`}
                  className="race-header"
                >
                  {header.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(
              {
                length: Math.max(
                  ...races.map((race) => race.slots.length),
                  0,
                ),
              },
              (_, posIdx) => (
                <tr key={`race-result-pos-${posIdx}`}>
                  <td>{posIdx + 1}</td>
                  {races.map((race, raceIdx) => {
                    const sortedSlots = getSortedRaceSlots(race.slots);
                    const slot = sortedSlots[posIdx];
                    if (!slot?.totalTime) {
                      return (
                        <td key={`race-result-${raceIdx}-${posIdx}`}>-</td>
                      );
                    }

                    const winner = sortedSlots[0];
                    const penaltySeconds = slot.timePenaltySeconds ?? 0;
                    const totalTimeSeconds =
                      parseTime(slot.totalTime) + penaltySeconds;
                    const formattedTime =
                      posIdx === 0
                        ? Number.isFinite(totalTimeSeconds)
                          ? makeTime(totalTimeSeconds)
                          : slot.totalTime
                        : calculateGapFromWinner(winner, slot);
                    const vehicleIcon = getVehicleIcon(slot.vehicleId);
                    const vehicleName = getVehicleName(
                      slot.vehicleId,
                      slot.vehicle,
                    );
                    const isHuman =
                      race.slots &&
                      race.slots.length > 0 &&
                      race.slots[0].driver === slot.driver;

                    return (
                      <td
                        key={`race-result-${raceIdx}-${posIdx}`}
                        className="race-result-cell"
                      >
                        <div
                          className={`race-result-entry${isHuman ? " human-driver" : ""}`}
                        >
                          <div className="result-driver">
                            {slot.driver}
                            {penaltySeconds > 0 && (
                              <span className="result-time-penalty">
                                +{penaltySeconds}s
                              </span>
                            )}
                          </div>
                          <div className="result-vehicle">
                            {vehicleIcon && (
                              <img
                                src={vehicleIcon}
                                className="vehicle-icon"
                                alt={vehicleName}
                              />
                            )}
                            <span>{vehicleName}</span>
                          </div>
                          <div className="result-time">{formattedTime}</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {/* Best Lap Times Per Race */}
      {bestLapTimes.some((race) => race.length > 0) && (
        <div className="results-table-wrapper">
          <table className="results-table">
            <caption>Best Race Lap Times</caption>
            <thead>
              <tr>
                <th>Pos</th>
                {raceHeaders.map((header) => (
                  <th
                    key={`${header.name}-${header.time}`}
                    className="race-header"
                  >
                    {header.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {new Array(
                Math.max(
                  ...bestLapTimes.map((r) => r.length).filter((l) => l > 0),
                  0,
                ),
              )
                .fill(undefined)
                .map((_, posIdx) => (
                  <tr key={`best-lap-pos-${championship.alias}-${posIdx}`}>
                    <td>{posIdx + 1}</td>
                    {bestLapTimes.map((raceTimesArray, raceIdx) => {
                      const time = raceTimesArray[posIdx];
                      if (!time) {
                        return (
                          <td
                            key={`lap-${championship.alias}-${raceIdx}-${posIdx}`}
                          >
                            -
                          </td>
                        );
                      }
                      const vehicleIcon = getVehicleIcon(time.vehicleId);
                      const vehicleName = getVehicleName(
                        time.vehicleId,
                        time.vehicle,
                      );
                      const diff =
                        posIdx > 0
                          ? formatTimeDiff(
                              raceTimesArray[0].timeMs,
                              time.timeMs,
                            )
                          : "";
                      return (
                        <td
                          key={`lap-${championship.alias}-${raceIdx}-${posIdx}`}
                          className="time-cell"
                        >
                          <div
                            className={`time-entry${time.isHuman ? " human-driver" : ""}`}
                          >
                            <div className="time-driver">{time.driver}</div>
                            <div className="time-info">
                              {vehicleIcon && (
                                <img
                                  src={vehicleIcon}
                                  className="vehicle-icon"
                                  alt={vehicleName}
                                />
                              )}
                              <span className="time-value">{time.time}</span>
                              {diff && (
                                <span className="time-diff">{diff}</span>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Best Qualifying Times Per Race */}
      {bestQualTimes.some((race) => race.length > 0) && (
        <div className="results-table-wrapper">
          <table className="results-table">
            <caption>Best Qualification Times</caption>
            <thead>
              <tr>
                <th>Pos</th>
                {raceHeaders.map((header) => (
                  <th
                    key={`${header.name}-${header.time}`}
                    className="race-header"
                  >
                    {header.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {new Array(
                Math.max(
                  ...bestQualTimes.map((r) => r.length).filter((l) => l > 0),
                  0,
                ),
              )
                .fill(undefined)
                .map((_, posIdx) => (
                  <tr key={`best-qual-pos-${championship.alias}-${posIdx}`}>
                    <td>{posIdx + 1}</td>
                    {bestQualTimes.map((raceTimesArray, raceIdx) => {
                      const time = raceTimesArray[posIdx];
                      if (!time) {
                        return (
                          <td
                            key={`qual-${championship.alias}-${raceIdx}-${posIdx}`}
                          >
                            -
                          </td>
                        );
                      }
                      const vehicleIcon = getVehicleIcon(time.vehicleId);
                      const vehicleName = getVehicleName(
                        time.vehicleId,
                        time.vehicle,
                      );
                      const diff =
                        posIdx > 0
                          ? formatTimeDiff(
                              raceTimesArray[0].timeMs,
                              time.timeMs,
                            )
                          : "";
                      return (
                        <td
                          key={`qual-${championship.alias}-${raceIdx}-${posIdx}`}
                          className="time-cell"
                        >
                          <div
                            className={`time-entry${time.isHuman ? " human-driver" : ""}`}
                          >
                            <div className="time-driver">{time.driver}</div>
                            <div className="time-info">
                              {vehicleIcon && (
                                <img
                                  src={vehicleIcon}
                                  className="vehicle-icon"
                                  alt={vehicleName}
                                />
                              )}
                              <span className="time-value">{time.time}</span>
                              {diff && (
                                <span className="time-diff">{diff}</span>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {penaltyModal === "points" && (
        <PointsPenaltyModal
          drivers={driverStandings.map((s) => s.driver)}
          penalties={championship.pointsPenalties ?? {}}
          onSave={savePointsPenalty}
          onHide={() => setPenaltyModal(null)}
        />
      )}

      {penaltyModal === "seconds" && (
        <SecondsPenaltyModal
          races={races}
          onSave={saveSeconds}
          onHide={() => setPenaltyModal(null)}
        />
      )}

      {/* Reset all penalties confirmation modal */}
      <Modal
        show={showResetConfirm}
        onHide={() => setShowResetConfirm(false)}
        centered
        contentClassName="penalty-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Reset all penalties</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            This clears <strong>all</strong> penalties for this championship —
            both championship points penalties and per-race time penalties.
          </p>
          <p className="mb-0">This action cannot be undone. Continue?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowResetConfirm(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={resetAllPenalties}>
            <FontAwesomeIcon icon={faEraser} className="me-2" />
            Reset all penalties
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ResultsDatabaseDetail;
