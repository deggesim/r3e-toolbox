import React from "react";
import { Card, Form } from "react-bootstrap";
import type { Assets } from "../types";

interface FileUploadSectionProps {
  onJsonUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onXmlUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  assets: Assets | null;
  xmlInputRef: React.RefObject<HTMLInputElement | null>;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  onJsonUpload,
  onXmlUpload,
  assets,
  xmlInputRef,
}) => {
  return (
    <Form>
      <h5 className="mb-3">File Upload</h5>
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <Form.Group>
            <Form.Label>RaceRoom Data JSON</Form.Label>
            <Form.Control type="file" accept=".json" onChange={onJsonUpload} />
          </Form.Group>
        </div>
        <div className="col-md-6">
          <Form.Group>
            <Form.Label>AI Adaptation XML</Form.Label>
            <Form.Control
              type="file"
              accept=".xml"
              onChange={onXmlUpload}
              ref={xmlInputRef}
            />
          </Form.Group>
        </div>
      </div>

      {assets && (
        <Card bg="dark" className="border-secondary mb-4">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center text-white-50">
              <div>
                <strong>Loaded:</strong> {assets.numClasses} classes and{" "}
                {assets.numTracks} tracks
              </div>
            </div>
          </Card.Body>
        </Card>
      )}
    </Form>
  );
};

export default FileUploadSection;
