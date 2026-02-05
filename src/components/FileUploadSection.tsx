import React from "react";
import { Form } from "react-bootstrap";
import type { Assets } from "../types";

interface FileUploadSectionProps {
  onXmlUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  assets: Assets | null;
  xmlInputRef: React.RefObject<HTMLInputElement | null>;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  onXmlUpload,
  xmlInputRef,
}) => {
  return (
    <Form>
      <h5 className="mb-3">File Upload</h5>
      <div className="g-3 mb-4">
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
    </Form>
  );
};

export default FileUploadSection;
