import React from "react";
import { Form } from "react-bootstrap";
import type { Assets } from "../types";

interface FileUploadSectionProps {
  onJsonUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onXmlUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  assets: Assets | null;
  xmlInputRef: React.RefObject<HTMLInputElement | null>;
  showJsonInput?: boolean;
  showXmlInput?: boolean;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  onJsonUpload,
  onXmlUpload,
  xmlInputRef,
  showJsonInput = true,
  showXmlInput = true,
}) => {
  const hasVisibleInputs = showJsonInput || showXmlInput;

  return (
    <Form>
      {hasVisibleInputs && (
        <>
          <h5 className="mb-3">File Upload</h5>
          <div className="row g-3 mb-4">
            {showJsonInput && (
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>RaceRoom Data JSON</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".json"
                    onChange={onJsonUpload}
                  />
                </Form.Group>
              </div>
            )}
            {showXmlInput && (
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
            )}
          </div>
        </>
      )}
    </Form>
  );
};

export default FileUploadSection;
