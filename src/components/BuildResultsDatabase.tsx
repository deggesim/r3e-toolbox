import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  ListGroup,
  Row,
  Spinner,
} from "react-bootstrap";
import type { LeaderboardAssets } from "../types";
import { fetchLeaderboardAssets } from "../utils/leaderboardAssets";

function SectionTitle({ label }: { readonly label: string }) {
  return (
    <div className="d-flex align-items-center gap-2 mb-3">
      <div
        style={{ width: 6, height: 28, background: "#646cff" }}
        aria-hidden
      />
      <h3 className="h5 m-0 text-uppercase text-muted">{label}</h3>
    </div>
  );
}

function AssetPreview({ assets }: { readonly assets: LeaderboardAssets }) {
  const previewItems = useMemo(
    () => assets.classes.slice(0, 6).concat(assets.tracks.slice(0, 6)),
    [assets.classes, assets.tracks],
  );

  if (previewItems.length === 0) return null;

  return (
    <div className="d-flex flex-wrap gap-3 mt-3">
      {previewItems.map((item) => (
        <div
          key={`${item.id}-${item.name}`}
          className="d-flex gap-2 align-items-center"
        >
          {item.iconUrl ? (
            <img
              src={item.iconUrl}
              alt={item.name}
              style={{ width: 36, height: 36, objectFit: "contain" }}
            />
          ) : (
            <div
              style={{ width: 36, height: 36, background: "#1f1f2b" }}
              aria-hidden
            />
          )}
          <span className="text-white-50 small">{item.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function BuildResultsDatabase() {
  const [assets, setAssets] = useState<LeaderboardAssets | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [htmlOverride, setHtmlOverride] = useState("");
  const [resultFiles, setResultFiles] = useState<File[]>([]);
  const [championshipAlias, setChampionshipAlias] = useState("");

  const resultFolder = useMemo(() => {
    const first = resultFiles[0]?.webkitRelativePath;
    return first ? first.split("/")[0] : "";
  }, [resultFiles]);

  const resultsSummary = useMemo(() => {
    if (resultFiles.length === 0) return "Nessun file selezionato";
    return (
      `${resultFiles.length} file risultati` +
      (resultFolder ? ` da ${resultFolder}` : "")
    );
  }, [resultFiles.length, resultFolder]);

  const handleAssetsDownload = useCallback(async () => {
    setIsLoadingAssets(true);
    setAssetsError(null);
    try {
      const data = await fetchLeaderboardAssets(
        htmlOverride.trim() ? { htmlOverride: htmlOverride.trim() } : undefined,
      );
      setAssets(data);
    } catch (error) {
      setAssets(null);
      setAssetsError(
        error instanceof Error ? error.message : "Errore durante il download",
      );
    } finally {
      setIsLoadingAssets(false);
    }
  }, [htmlOverride]);

  const handleFolderChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files ? Array.from(event.target.files) : [];
      setResultFiles(files);
    },
    [],
  );

  return (
    <Container className="py-4">
      <Card bg="dark" text="white" className="border-secondary">
        <Card.Header
          as="h2"
          className="text-center"
          style={{
            background: "linear-gradient(135deg, #646cff 0%, #535bf2 100%)",
            color: "white",
          }}
        >
          📊 Build Results Database
        </Card.Header>
        <Card.Body className="p-4">
          <SectionTitle label="Step 1 · Scarica le icone dal leaderboard" />
          <Row className="g-3 align-items-start">
            <Col lg={7}>
              <p className="text-muted mb-3">
                Recuperiamo le classi auto e i circuiti direttamente da
                https://game.raceroom.com/leaderboard per ottenere le icone
                ufficiali aggiornate. Se il CORS del sito blocca la chiamata,
                incolla qui sotto l&apos;HTML della pagina e ripeti
                l&apos;analisi.
              </p>
              <div className="d-flex gap-2 mb-3">
                <Button
                  variant="primary"
                  onClick={handleAssetsDownload}
                  disabled={isLoadingAssets}
                >
                  {isLoadingAssets ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Analizzo la pagina...
                    </>
                  ) : (
                    "Scarica e analizza"
                  )}
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setHtmlOverride("");
                    setAssets(null);
                    setAssetsError(null);
                  }}
                  disabled={isLoadingAssets}
                >
                  Reset
                </Button>
              </div>
              <Form.Group className="mb-3" controlId="htmlOverride">
                <Form.Label className="text-white-50">
                  HTML manuale (opzionale)
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Incolla qui il sorgente di https://game.raceroom.com/leaderboard se il download diretto è bloccato"
                  value={htmlOverride}
                  onChange={(e) => setHtmlOverride(e.target.value)}
                />
              </Form.Group>
              {assetsError && (
                <Alert variant="danger" className="mb-3">
                  {assetsError}
                </Alert>
              )}
            </Col>
            <Col lg={5}>
              <Card bg="secondary" text="white" className="h-100">
                <Card.Body>
                  <Card.Title className="h6">Stato attuale</Card.Title>
                  {assets ? (
                    <>
                      <ListGroup variant="flush" className="text-white">
                        <ListGroup.Item className="bg-secondary text-white d-flex justify-content-between">
                          <span>Classi auto</span>
                          <Badge bg="light" text="dark">
                            {assets.classes.length}
                          </Badge>
                        </ListGroup.Item>
                        <ListGroup.Item className="bg-secondary text-white d-flex justify-content-between">
                          <span>Tracciati</span>
                          <Badge bg="light" text="dark">
                            {assets.tracks.length}
                          </Badge>
                        </ListGroup.Item>
                        <ListGroup.Item className="bg-secondary text-white">
                          <small className="text-white-50">
                            Ultimo aggiornamento: {assets.fetchedAt}
                          </small>
                        </ListGroup.Item>
                      </ListGroup>
                      <AssetPreview assets={assets} />
                    </>
                  ) : (
                    <p className="text-white-50 m-0">
                      Nessun asset caricato. Avvia il download o incolla
                      l&apos;HTML.
                    </p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <hr className="my-4 border-secondary" />
          <SectionTitle label="Step 2 · Sorgente risultati e alias" />
          <Row className="g-3">
            <Col lg={6}>
              <Form.Group controlId="resultsFolder" className="mb-3">
                <Form.Label>Cartella con i risultati RaceRoom</Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  webkitdirectory="true"
                  onChange={handleFolderChange}
                />
                <Form.Text className="text-white-50">
                  Suggerito: UserData/Log/Results oppure esportazioni dedicate.
                </Form.Text>
              </Form.Group>
              <Alert variant="secondary" className="py-2 mb-3">
                {resultsSummary}
              </Alert>
            </Col>
            <Col lg={6}>
              <Form.Group controlId="championshipAlias" className="mb-3">
                <Form.Label>Alias campionato</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Es. DTM Classic 2026"
                  value={championshipAlias}
                  onChange={(e) => setChampionshipAlias(e.target.value)}
                />
                <Form.Text className="text-white-50">
                  Verrà usato per nominare l&apos;archivio finale e i file JSON.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <hr className="my-4 border-secondary" />
          <SectionTitle label="Step 3 · Esportazione archivio" />
          <p className="text-white-50 mb-0">
            In questo step genereremo l&apos;archivio HTML/JSON con classifiche
            e database risultati, replicando la logica di r3e-open-championship.
            Sarà attivato dopo aver completato i passi precedenti.
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
}
