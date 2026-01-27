import { useMemo } from "react";
import { Button, Card, Col, Container, Form, Row } from "react-bootstrap";
import type { Config } from "../config";
import { CFG } from "../config";
import { useConfigStore } from "../store/configStore";

type NumericConfigKey = {
  [K in keyof Config]: Config[K] extends number ? K : never;
}[keyof Config];

type BooleanConfigKey = {
  [K in keyof Config]: Config[K] extends boolean ? K : never;
}[keyof Config];

type NumberField = {
  key: NumericConfigKey;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  helper?: string;
};

const numberFields: NumberField[] = [
  { key: "minAI", label: "Minimum AI", min: 60, max: 120, step: 1 },
  { key: "maxAI", label: "Maximum AI", min: 60, max: 120, step: 1 },
  {
    key: "testMinAIdiffs",
    label: "Min AI spread for fitting",
    min: 1,
    max: 20,
    step: 1,
    helper: "Minimum distance between lowest and highest sampled AI levels",
  },
  {
    key: "testMaxTimePct",
    label: "Max deviation pct",
    min: 0,
    max: 1,
    step: 0.01,
    helper: "Tolerance as a fraction of the minimum lap time (e.g. 0.1 = 10%)",
  },
  {
    key: "testMaxFailsPct",
    label: "Max failure pct",
    min: 0,
    max: 1,
    step: 0.01,
    helper: "Allowed share of samples that can fail validation",
  },
  {
    key: "aiNumLevels",
    label: "AI levels applied",
    min: 1,
    max: 20,
    step: 1,
    helper: "Number of AI levels applied around the selected target",
  },
  {
    key: "aiSpacing",
    label: "AI spacing",
    min: 1,
    max: 5,
    step: 1,
    helper: "Step between AI levels when writing generated times",
  },
];

export default function Settings() {
  const { config, setConfig, resetConfig } = useConfigStore();

  const booleanFields = useMemo(
    () => [
      {
        key: "fitAll" as BooleanConfigKey,
        label: "Fit all lap times",
        helper:
          "If enabled, use every lap time instead of the average per AI level when fitting.",
      },
    ],
    [],
  );

  const handleNumberChange = (key: NumericConfigKey, value: number) => {
    if (Number.isFinite(value)) {
      setConfig({ [key]: value } as Partial<Config>);
    }
  };

  return (
    <Container className="py-4">
      <Card bg="dark" text="white" className="border-secondary mb-4">
        <Card.Header
          as="h2"
          className="text-center"
          style={{
            background: "linear-gradient(135deg, #646cff 0%, #535bf2 100%)",
            color: "white",
          }}
        >
          ⚙️ Settings
        </Card.Header>
        <Card.Body>
          <Card.Text className="text-white-50 mb-4">
            Configure fitting and UI defaults. Values persist in your browser
            localStorage and can be reset to the built-in defaults from
            config.ts.
          </Card.Text>

          <Row className="g-4">
            {numberFields.map((field) => (
              <Col md={6} key={field.key}>
                <Form.Group>
                  <Form.Label className="d-flex justify-content-between">
                    <span>{field.label}</span>
                    <small className="text-white-50">
                      Default: {CFG[field.key]}
                    </small>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step ?? 1}
                    value={config[field.key]}
                    onChange={(e) =>
                      handleNumberChange(field.key, Number(e.target.value))
                    }
                  />
                  {field.helper && (
                    <Form.Text className="text-white-50">
                      {field.helper}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            ))}
          </Row>

          <Row className="g-4 mt-1">
            {booleanFields.map((field) => (
              <Col md={6} key={field.key}>
                <Form.Group className="d-flex align-items-center justify-content-between p-3 border border-secondary rounded">
                  <div>
                    <div>{field.label}</div>
                    {field.helper && (
                      <Form.Text className="text-white-50">
                        {field.helper}
                      </Form.Text>
                    )}
                  </div>
                  <Form.Check
                    type="switch"
                    id={field.key}
                    checked={Boolean(config[field.key])}
                    onChange={(e) =>
                      setConfig({
                        [field.key]: e.target.checked,
                      } as Partial<Config>)
                    }
                  />
                </Form.Group>
              </Col>
            ))}
          </Row>

          <div className="d-flex justify-content-end mt-4 gap-2">
            <Button onClick={resetConfig}>Reset to defaults</Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
