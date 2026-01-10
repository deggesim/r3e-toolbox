import React, { useState, useEffect, useMemo } from "react";
import type { Assets, ProcessedDatabase, PlayerTimes, Database } from "../types";
import { makeTime } from "../utils/timeUtils";
import { computeTime } from "../utils/timeUtils";
import { buildXML } from "../utils/xmlBuilder";
import { CFG } from "../config";

interface AIPrimerGUIProps {
  assets: Assets | null;
  processed: ProcessedDatabase | null;
  playertimes: PlayerTimes | null;
  onApplyModification: (
    classid: string,
    trackid: string,
    aifrom: number,
    aito: number,
    aiSpacing: number
  ) => Database;
  onRemoveGenerated: () => void;
  onResetAll: () => void;
}

const AIPrimerGUI: React.FC<AIPrimerGUIProps> = ({
  assets,
  processed,
  playertimes,
  onApplyModification,
  onRemoveGenerated,
  onResetAll,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [selectedAILevel, setSelectedAILevel] = useState<number | null>(null);

  const aiNumLevels = CFG.aiNumLevels;
  const aiSpacing = CFG.aiSpacing;

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
    [assets, processed, playertimes]
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
    [assets, processed, playertimes, selectedClassId]
  );

  useEffect(() => {
    if (availableClasses.length > 0) {
      // Check if current selectedClassId is still available
      const isCurrentAvailable = availableClasses.some(
        (cls) => cls.id === selectedClassId
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
        (track) => track.id === selectedTrackId
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
    ? Math.max(CFG.minAI, selectedAILevel - Math.floor(aiNumLevels / 2))
    : CFG.minAI;
  const aito = Math.min(CFG.maxAI, aifrom + aiNumLevels - 1);

  const handleApply = () => {
    if (selectedClassId && selectedTrackId && selectedAILevel !== null) {
      const shouldApply = confirm(
        `Apply modification:\n\n${assets!.classes[selectedClassId].name} - ${assets!.tracks[selectedTrackId].name}\nAI Range: ${aifrom} - ${aito}\n\nThis will download the modified aiadaptation.xml file.`
      );

      if (shouldApply) {
        // Call the callback to apply modifications to database
        const updatedDb = onApplyModification(
          selectedClassId,
          selectedTrackId,
          aifrom,
          aito,
          aiSpacing
        );

        // Download the XML file using the updated database from callback
        if (assets && updatedDb) {
          try {
            const xmlContent = buildXML(updatedDb, playertimes || { classes: {} }, assets);
            const blob = new Blob([xmlContent], { type: "application/xml" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "aiadaptation.xml";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } catch (error) {
            console.error("Error generating XML:", error);
            alert("Error generating XML file");
          }
        }
      }
    }
  };

  const isApplyDisabled =
    !selectedClassId || !selectedTrackId || selectedAILevel === null;

  if (!assets) {
    return <div>Please upload RaceRoom Data JSON file first.</div>;
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ marginBottom: "20px" }}>
        <button onClick={onRemoveGenerated} style={{ marginRight: "10px" }}>
          Remove likely generated
        </button>
        <button onClick={onResetAll}>Reset all AI times</button>
      </div>

      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <div style={{ flex: 1 }}>
          <h3>Classes</h3>
          <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #ccc" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "14px" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ccc", padding: "8px", backgroundColor: "#f0f0f0", position: "sticky", top: 0, color: "#333" }}>Class</th>
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
                    style={{
                      cursor: "pointer",
                      backgroundColor: selectedClassId === cls.id ? "#b8b8b8" : "transparent",
                      border: "1px solid #ccc",
                    }}
                  >
                    <td style={{ padding: "8px" }}>{cls.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ flex: 2 }}>
          <h3>Tracks</h3>
          <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #ccc" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "14px" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ccc", padding: "8px", backgroundColor: "#f0f0f0", position: "sticky", top: 0, color: "#333" }}>Track</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px", backgroundColor: "#f0f0f0", position: "sticky", top: 0, color: "#333" }}>Player Best</th>
                </tr>
              </thead>
              <tbody>
                {availableTracks.map((track) => {
                  const playerClass = playertimes?.classes[selectedClassId];
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
                      style={{
                        cursor: "pointer",
                        backgroundColor: selectedTrackId === track.id ? "#b8b8b8" : "transparent",
                        border: "1px solid #ccc",
                      }}
                    >
                      <td style={{ padding: "8px" }}>{track.name}</td>
                      <td style={{ padding: "8px" }}>{playerTime}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h3>AI Levels</h3>
          <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #ccc" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "14px" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ccc", padding: "8px", backgroundColor: "#f0f0f0", position: "sticky", top: 0, color: "#333" }}>AI</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px", backgroundColor: "#f0f0f0", position: "sticky", top: 0, color: "#333" }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {aiLevels.map(({ ai, time }) => (
                  <tr
                    key={ai}
                    onClick={() => setSelectedAILevel(ai)}
                    style={{
                      cursor: "pointer",
                      backgroundColor: selectedAILevel === ai ? "#b8b8b8" : "transparent",
                      border: "1px solid #ccc",
                      fontWeight: selectedAILevel === ai ? "bold" : "normal",
                    }}
                  >
                    <td style={{ padding: "8px" }}>{ai}</td>
                    <td style={{ padding: "8px" }}>{makeTime(time, ":")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h3>Modification</h3>
        <p>
          {selectedClassId && selectedTrackId && selectedAILevel
            ? `${assets.classes[selectedClassId].name} - ${assets.tracks[selectedTrackId].name} : ${aifrom} - ${aito} step: ${aiSpacing}`
            : "Select class, track, and AI level"}
        </p>
        <button
          onClick={handleApply}
          disabled={isApplyDisabled}
          style={{ cursor: isApplyDisabled ? "default" : "pointer" }}
        >
          Apply Selected Modification
        </button>
      </div>
    </div>
  );
};

export default AIPrimerGUI;
