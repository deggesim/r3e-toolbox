import type { ChangeEvent, RefObject } from "react";
import { Form } from "react-bootstrap";
import type { Assets } from "../types";

interface FileUploadSectionProps {
  onXmlUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  assets: Assets | null;
  xmlInputRef: RefObject<HTMLInputElement | null>;
}

const FileUploadSection = ({
  onXmlUpload,
  xmlInputRef,
}: FileUploadSectionProps) => {
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
