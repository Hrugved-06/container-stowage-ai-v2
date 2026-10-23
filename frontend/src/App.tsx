
import { useEffect, useState } from "react";

import "./App.css";

type Tab = "overview" | "cargo" | "vessel" | "ai";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [latestPlan, setLatestPlan] = useState<{
  assignments: {
    container_id: string;
    position_code: string;
    occupied_positions?: string[];
    size_ft?: number;
    selection_mode?: string;
    assignment_reason?: string;
    reason_details?: string[];
  }[];
} | null>(null);

  const [uploadedContainers, setUploadedContainers] = useState<
    Record<string, unknown>[]
  >([]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "cargo", label: "Cargo Manifest" },
    { id: "vessel", label: "Vessel Layout" },
    { id: "ai", label: "AI Assistant" },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <div>
            <strong>STOWAGE AI</strong>
            <span>Vessel planning system</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          Local AI · Ollama
          <small>Qwen 2.5 7B</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>Marine Operations / Planning</span>
          <span className="local-badge">LOCAL ENVIRONMENT</span>
        </header>

        <section className="page-content">
          <div className="hero-panel">
            <p className="eyebrow">AI / OPTIMIZATION & VOYAGE PLANNING ENGINE</p>
            <h1>
              {tabs.find((tab) => tab.id === activeTab)?.label}
            </h1>
            <p className="subtitle">
              AI-assisted cargo scheduling and voyage planning.
            </p>

            <div className="hero-status-row">
              <span className="engine-badge">AI / Optimization Engine</span>
              <span className="connection-badge">
                <span className="status-dot" />
                Backend Connected
              </span>
            </div>
          </div>

          {activeTab === "overview" && (
            <>
              <div className="metric-grid">
                
            

  <Metric
    title="Vessel Slots"
    value="4,000"
    detail="Synthetic vessel positions"
  />

  <Metric
    title="Uploaded Containers"
    value={String(uploadedContainers.length)}
    detail="Imported cargo manifest"
  />

  <Metric
    title="Assigned Containers"
    value={String(latestPlan?.assignments.length ?? 0)}
    detail="Latest stowage plan"
  />

  <Metric
    title="Plan Status"
    value={latestPlan ? "Generated" : "Draft"}
    detail={latestPlan ? "Plan available" : "No plan generated"}
  />



              </div>

              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Planning workspace</h2>
                    <p>Start by defining your cargo and vessel.</p>
                  </div>
                  
<span className="draft-badge">
  {latestPlan
    ? "PLAN GENERATED"
    : uploadedContainers.length > 0
    ? "MANIFEST LOADED"
    : "NOT CONFIGURED"}
</span>

                </div>

                <div className="action-grid">
                  <ActionCard
                    number="01"
                    title="Cargo manifest"
                    description="Define container sizes, weights, destinations and special handling."
                    onClick={() => setActiveTab("cargo")}
                  />
                  <ActionCard
                    number="02"
                    title="Vessel layout"
                    description="Configure bays, rows, tiers, holds and deck positions."
                    onClick={() => setActiveTab("vessel")}
                  />
                  <ActionCard
                    number="03"
                    title="AI assistant"
                    description="Ask the local model about planning concepts and decisions."
                    onClick={() => setActiveTab("ai")}
                  />
                </div>
              </div>
            </>
          )}


          {activeTab === "cargo" && (
            <>
              <ManifestUpload
                uploadedContainers={uploadedContainers}
                setUploadedContainers={setUploadedContainers}
              />
              <CargoManifestForm
                uploadedContainers={uploadedContainers}
                onPlanGenerated={setLatestPlan}
              />

            </>
          )}

          {activeTab === "vessel" && (
            <VesselLayout plan={latestPlan} />
          )}

          {activeTab === "ai" && (
            <div className="panel">
              <h2>Local AI Assistant</h2>
              <p>
                Ask questions about container stowage, cargo scheduling, and
                voyage planning. Powered locally by Qwen 2.5 7B through Ollama.
              </p>

              <LocalAIChat />
            </div>
          )}


          <footer>
            AI-Driven Container Vessel Cargo Scheduling and Voyage Planning
            System
          </footer>
        </section>
      </main>
    </div>
  );
}

function Metric({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="metric-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function ActionCard({
  number,
  title,
  description,
  onClick,
}: {
  number: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button className="action-card" onClick={onClick}>
      <span className="action-number">{number}</span>
      <strong>{title}</strong>
      <span>{description}</span>
      <span className="action-link">Open workspace →</span>
    </button>
  );
}




function CargoManifestForm({
  uploadedContainers,
  onPlanGenerated,
}: {
  uploadedContainers: Record<string, unknown>[];
  onPlanGenerated: (plan: {
    assignments: {
      container_id: string;
      position_code: string;
      occupied_positions?: string[];
      size_ft?: number;
      selection_mode?: string;
      assignment_reason?: string;
      reason_details?: string[];
    }[];
  }) => void;
}) {

  const [containers, setContainers] = useState([
    {
      container_id: "CONT-001",
      size_ft: 20,
      weight_kg: 12000,
      loading_port: "JNPT",
      discharge_port: "Singapore",
      destination_order: 1,
      refrigerated: false,
      hazardous: false,
    },
  ]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [useAIForPlacement, setUseAIForPlacement] = useState(false);
  const [savingFormat, setSavingFormat] = useState<string | null>(null);

  const [portSequence, setPortSequence] = useState("JNPT, Singapore, Hamburg");
  const [voyageLoading, setVoyageLoading] = useState(false);
  const [voyageMessage, setVoyageMessage] = useState("");
  const [voyageResult, setVoyageResult] = useState<null | {
    port_sequence: string[];
    total_containers: number;
    vessel_slot_count: number;
    events: {
      port: string;
      loaded: string[];
      discharged: string[];
      onboard_after_port_call: number;
    }[];
    remaining_onboard_after_final_port: string[];
    limitations: string[];
  }>(null);



const [plan, setPlan] = useState<null | {
  assigned_count: number;
  unassigned_count: number;
  ai_proposed_count: number;
  ai_accepted_count: number;
  ai_fallback_count: number;
  assignments: {
    container_id: string;
    position_code: string;
    selection_mode?: string;
    assignment_reason?: string;
    reason_details?: string[];
  }[];
  unassigned: {
    container_id: string;
    reason: string;
  }[];
}>(null);

  async function generatePlan() {
    setLoading(true);
    setMessage("");
    setPlan(null);

    try {
      console.log("Generate plan clicked");

      const containersToSend =
        uploadedContainers.length > 0 ? uploadedContainers : containers;

      console.log("Containers to send:", containersToSend.length);
      console.log("Sending POST /api/plan");

      const response = await fetch("http://127.0.0.1:8000/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manifest: {
            containers: containersToSend.map((item) => ({
              container_id: String(item.container_id),
              size_ft: Number(item.size_ft) as 20 | 40,
              weight_kg: Number(item.weight_kg),
              loading_port: String(item.loading_port),
              discharge_port: String(item.discharge_port),
              destination_order: Number(item.destination_order ?? 1),
              refrigerated: Boolean(item.refrigerated ?? false),
              hazardous: Boolean(item.hazardous ?? false),
            })),
          },
          use_ai: useAIForPlacement,
        }),
      });

      console.log("Plan response received:", response.status);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Failed to generate stowage plan."
        );
      }

      setPlan(data);
      onPlanGenerated(data);
      setMessage("Stowage plan generated successfully.");
    } catch (error) {
      console.error("Plan generation failed:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to contact the backend."
      );
    } finally {
      setLoading(false);
    }
  }


  async function savePlan(fileFormat: "pdf" | "xlsx" | "csv" | "json" | "docx") {
    if (!plan) return;

    setSavingFormat(fileFormat);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/plan/export/${fileFormat}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(plan),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.detail ?? "Could not save the generated plan."
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `stowage_plan.${fileFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage(
        `Plan saved successfully as ${fileFormat.toUpperCase()}.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save the generated plan."
      );
    } finally {
      setSavingFormat(null);
    }
  }


  async function simulateVoyage() {
    const ports = portSequence
      .split(",")
      .map((port) => port.trim())
      .filter(Boolean);

    if (ports.length < 2) {
      setVoyageMessage("Enter at least two ports, separated by commas.");
      return;
    }

    const containersToSend =
      uploadedContainers.length > 0 ? uploadedContainers : containers;

    const requiredPorts = new Set<string>();

    containersToSend.forEach((item) => {
      requiredPorts.add(String(item.loading_port).trim());
      requiredPorts.add(String(item.discharge_port).trim());
    });

    const missingPorts = [...requiredPorts].filter(
      (port) => port && !ports.includes(port)
    );

    if (missingPorts.length > 0) {
      setVoyageMessage(
        `Port sequence is missing: ${missingPorts.join(", ")}. Add all loading and discharge ports used by the manifest.`
      );
      return;
    }

    setVoyageLoading(true);
    setVoyageMessage("");
    setVoyageResult(null);

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/api/voyage/simulate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            manifest: {
              containers: containersToSend.map((item) => ({
                container_id: String(item.container_id),
                size_ft: Number(item.size_ft),
                weight_kg: Number(item.weight_kg),
                loading_port: String(item.loading_port),
                discharge_port: String(item.discharge_port),
                destination_order: Number(item.destination_order ?? 1),
                refrigerated: Boolean(item.refrigerated ?? false),
                hazardous: Boolean(item.hazardous ?? false),
              })),
            },
            port_sequence: ports,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail ?? "Voyage simulation failed.")
        );
      }

      setVoyageResult(data);
      setVoyageMessage("Voyage simulation completed.");
    } catch (error) {
      setVoyageMessage(
        error instanceof Error ? error.message : "Unable to simulate voyage."
      );
    } finally {
      setVoyageLoading(false);
    }
  }


  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <h2>Cargo manifest</h2>
          <p>Enter the cargo for your planned voyage.</p>
        </div>
        <span className="draft-badge">
          {containers.length} CONTAINERS
        </span>
      </div>

      {containers.map((container, index) => (
        <div className="cargo-form-row" key={container.container_id}>
          <label>
            Container ID
            <input
              value={container.container_id}
              onChange={(e) =>
                setContainers((current) =>
                  current.map((item, i) =>
                    i === index
                      ? { ...item, container_id: e.target.value }
                      : item
                  )
                )
              }
            />
          </label>

          <label>
            Size
            <select
              value={container.size_ft}
              onChange={(e) =>
                setContainers((current) =>
                  current.map((item, i) =>
                    i === index
                      ? { ...item, size_ft: Number(e.target.value) as 20 | 40 }
                      : item
                  )
                )
              }
            >
              <option value={20}>20 ft</option>
              <option value={40}>40 ft</option>
            </select>
          </label>

          <label>
            Weight (kg)
            <input
              type="number"
              min="1"
              value={container.weight_kg}
              onChange={(e) =>
                setContainers((current) =>
                  current.map((item, i) =>
                    i === index
                      ? { ...item, weight_kg: Number(e.target.value) }
                      : item
                  )
                )
              }
            />
          </label>

          <label>
            Loading port
            <input
              value={container.loading_port}
              onChange={(e) =>
                setContainers((current) =>
                  current.map((item, i) =>
                    i === index
                      ? { ...item, loading_port: e.target.value }
                      : item
                  )
                )
              }
            />
          </label>

          <label>
            Discharge port
            <input
              value={container.discharge_port}
              onChange={(e) =>
                setContainers((current) =>
                  current.map((item, i) =>
                    i === index
                      ? { ...item, discharge_port: e.target.value }
                      : item
                  )
                )
              }
            />
          </label>

          <label>
            Destination order
            <input
              type="number"
              min="1"
              value={container.destination_order}
              onChange={(e) =>
                setContainers((current) =>
                  current.map((item, i) =>
                    i === index
                      ? { ...item, destination_order: Number(e.target.value) }
                      : item
                  )
                )
              }
            />
          </label>

          <label className="cargo-checkbox">
            <input
              type="checkbox"
              checked={container.refrigerated}
              onChange={(e) =>
                setContainers((current) =>
                  current.map((item, i) =>
                    i === index
                      ? { ...item, refrigerated: e.target.checked }
                      : item
                  )
                )
              }
            />
            Refrigerated
          </label>

          <label className="cargo-checkbox">
            <input
              type="checkbox"
              checked={container.hazardous}
              onChange={(e) =>
                setContainers((current) =>
                  current.map((item, i) =>
                    i === index
                      ? { ...item, hazardous: e.target.checked }
                      : item
                  )
                )
              }
            />
            Hazardous
          </label>
        </div>
      ))}

      <label className="cargo-checkbox" style={{ marginTop: "16px" }}>
        <input
          type="checkbox"
          checked={useAIForPlacement}
          onChange={(event) => setUseAIForPlacement(event.target.checked)}
        />
        Use local AI slot suggestions (slower)
      </label>

      <div className="cargo-actions">
        <button
          className="secondary-button"
          onClick={() =>
            setContainers((current) => [
              ...current,
              {
                container_id: `CONT-${String(current.length + 1).padStart(3, "0")}`,
                size_ft: 20,
                weight_kg: 10000,
                loading_port: "JNPT",
                discharge_port: "Singapore",
                destination_order: 1,
                refrigerated: false,
                hazardous: false,
              },
            ])
          }
        >
          + Add container
        </button>

        <button
          className="primary-button"
          type="button"
          onClick={generatePlan}
          disabled={loading}
        >
          {loading ? "Generating plan..." : "Generate Stowage Plan"}
        </button>

        <span className="draft-badge">
          Ready to generate stowage plan
        </span>
      </div>


      <div className="panel" style={{ marginTop: "20px" }}>
        <h2>Multi-Port Voyage Simulation</h2>
        <p>Enter the planned port calls in sailing order.</p>

        <label>
          Port sequence (comma-separated)
          <input
            value={portSequence}
            onChange={(event) => setPortSequence(event.target.value)}
            placeholder="JNPT, Singapore, Hamburg"
          />
        </label>

        <div style={{ marginTop: "12px" }}>
          <button
            className="primary-button"
            type="button"
            onClick={simulateVoyage}
            disabled={voyageLoading}
          >
            {voyageLoading ? "Simulating..." : "Simulate Voyage"}
          </button>
        </div>

        {voyageMessage && (
          <p role="status" className="plan-message">{voyageMessage}</p>
        )}

        {voyageResult && (
          <div className="plan-results">
            <h3>Voyage Results</h3>
            <p>Containers: {voyageResult.total_containers}</p>
            <p>Vessel slots: {voyageResult.vessel_slot_count}</p>

            {voyageResult.events.map((event) => (
              <div key={event.port} className="panel">
                <h4>{event.port}</h4>
                <p>Loaded: {event.loaded.length ? event.loaded.join(", ") : "None"}</p>
                <p>
                  Discharged: {event.discharged.length
                    ? event.discharged.join(", ")
                    : "None"}
                </p>
                <p>Onboard after port call: {event.onboard_after_port_call}</p>
              </div>
            ))}

            <p>
              Remaining onboard after final port:{" "}
              {voyageResult.remaining_onboard_after_final_port.length
                ? voyageResult.remaining_onboard_after_final_port.join(", ")
                : "None"}
            </p>

            <h4>Simulation limitations</h4>
            <ul>
              {voyageResult.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>



      {message && (
        <p role="status" className="plan-message">
          {message}
        </p>
      )}

      {plan && (
        <div className="plan-results">
          <h3>Stowage Plan Results</h3>

          <p>Assigned containers: {plan.assigned_count}</p>
          <p>Unassigned containers: {plan.unassigned_count}</p>
          <p>AI proposals: {plan.ai_proposed_count}</p>
          <p>AI preferred slots accepted: {plan.ai_accepted_count}</p>
          <p>AI fallback slots used: {plan.ai_fallback_count}</p>

          <div className="save-plan-panel">
            <div>
              <h4>Save Plan</h4>
              <p>
                Download this generated plan to your computer so it remains
                available even after you close the website.
              </p>
            </div>

            <div className="save-plan-actions">
              {[
                ["pdf", "PDF"],
                ["xlsx", "Excel"],
                ["csv", "CSV"],
                ["json", "JSON"],
                ["docx", "Word"],
              ].map(([format, label]) => (
                <button
                  key={format}
                  type="button"
                  className="save-plan-button"
                  disabled={savingFormat !== null}
                  onClick={() =>
                    savePlan(
                      format as "pdf" | "xlsx" | "csv" | "json" | "docx"
                    )
                  }
                >
                  {savingFormat === format ? "Saving..." : label}
                </button>
              ))}
            </div>
          </div>

          {plan.assignments.length > 0 && (
            <>
              <h4>Assignments</h4>
              <div className="assignment-list">
                {plan.assignments.map((item) => (
                  <details className="assignment-card" key={item.container_id}>
                    <summary>
                      <strong>{item.container_id}</strong>
                      {" → "}
                      Position {item.position_code}
                      {item.assignment_reason && (
                        <span className="assignment-summary-reason">
                          {" · "}{item.assignment_reason}
                        </span>
                      )}
                    </summary>

                    {item.selection_mode && (
                      <p>
                        <strong>Selection mode:</strong>{" "}
                        {item.selection_mode.replaceAll("_", " ")}
                      </p>
                    )}

                    {item.reason_details?.length ? (
                      <ul>
                        {item.reason_details.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    ) : null}
                  </details>
                ))}
              </div>
            </>
          )}

          {plan.unassigned.length > 0 && (
            <>
              <h4>Unassigned Cargo</h4>
              <ul>
                {plan.unassigned.map((item) => (
                  <li key={item.container_id}>
                    {item.container_id}: {item.reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
</div>
  );
}


function LocalAIChat() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function askAI() {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) return;

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/ai/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: trimmedQuestion }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "The AI request failed."
        );
      }

      setAnswer(data.answer);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the local AI backend."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-chat">
      <label htmlFor="ai-question">Your question</label>
      <textarea
        id="ai-question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g. Why is vessel stability important?"
        rows={4}
      />

      <button
        className="primary-button"
        type="button"
        onClick={askAI}
        disabled={loading || !question.trim()}
      >
        {loading ? "Thinking..." : "Ask Local AI"}
      </button>

      {error && (
        <p role="alert" className="plan-message">
          {error}
        </p>
      )}

      {answer && (
        <div className="plan-results">
          <h3>AI Response</h3>
          <p className="ai-answer">{answer}</p>
        </div>
      )}
    </div>
  );
}


function ManifestUpload({
  setUploadedContainers,
}: {
  uploadedContainers: Record<string, unknown>[];
  setUploadedContainers: (containers: Record<string, unknown>[]) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [totalRows, setTotalRows] = useState<number | null>(null);

  const manifestColumns = [
    { name: "container_id", required: true, example: "CONT-0001" },
    { name: "size_ft", required: true, example: "20" },
    { name: "weight_kg", required: true, example: "18500" },
    { name: "loading_port", required: true, example: "JNPT" },
    { name: "discharge_port", required: true, example: "Singapore" },
    { name: "destination_order", required: false, example: "1" },
    { name: "refrigerated", required: false, example: "false" },
    { name: "hazardous", required: false, example: "false" },
  ];

  function downloadCsvTemplate() {
    const header = manifestColumns.map((column) => column.name).join(",");
    const example = manifestColumns.map((column) => column.example).join(",");
    const csv = `${header}\n${example}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "cargo_manifest_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }


  async function uploadManifest() {
    if (!file) {
      setMessage("Please select a CSV or Excel file first.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "http://127.0.0.1:8000/api/manifest/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Failed to upload manifest."
        );
      }

      const uploaded = Array.isArray(data.containers)
        ? data.containers
        : [];

      setUploadedContainers(uploaded);
      setPreview(uploaded.slice(0, 10));
      setTotalRows(uploaded.length);
      setMessage(`Manifest uploaded: ${uploaded.length} containers.`);
    } catch (error) {
      console.error("Manifest upload failed:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload manifest."
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    
<div className="panel manifest-upload">

      <h2>Import Cargo Manifest</h2>
      <p>
        Upload your container dataset in <strong>CSV (.csv)</strong> or{" "}
        <strong>Excel (.xlsx)</strong> format.
      </p>

      <div className="manifest-format-guide">
        <div className="manifest-format-heading">
          <div>
            <h3>Required dataset format</h3>
            <p>
              Keep these column names exactly as shown so the system can read
              the manifest correctly.
            </p>
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={downloadCsvTemplate}
          >
            Download CSV Template
          </button>
        </div>

        <div className="manifest-format-table-wrapper">
          <table className="manifest-format-table">
            <thead>
              <tr>
                {manifestColumns.map((column) => (
                  <th key={column.name}>
                    {column.name}
                    <span className={column.required ? "required-tag" : "optional-tag"}>
                      {column.required ? "Required" : "Optional"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {manifestColumns.map((column) => (
                  <td key={column.name}>{column.example}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="manifest-format-note">
          <strong>Rules:</strong> size_ft must be 20 or 40, weight_kg must be a
          positive number, and loading_port and discharge_port must be
          different. destination_order defaults to 1 if omitted; refrigerated
          and hazardous default to false.
        </p>
      </div>

      <input
        type="file"
        accept=".csv,.xlsx"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
          setMessage("");
          setPreview([]);
          setTotalRows(null);
        }}
      />

      <div style={{ marginTop: "16px" }}>
        <button
          className="primary-button"
          type="button"
          onClick={uploadManifest}
          disabled={!file || loading}
        >
          {loading ? "Uploading..." : "Upload Manifest"}
        </button>
      </div>

      {message && (
        <p role="status" className="plan-message">
          {message}
        </p>
      )}

      {totalRows !== null && (
        <div className="plan-results">
          <h3>Upload Results</h3>
          <p>Total rows: {totalRows}</p>
          <p>Showing up to 10 preview rows.</p>

          {preview.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    {Object.keys(preview[0]).map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, index) => (
                    <tr key={index}>
                      {Object.keys(preview[0]).map((column) => (
                        <td key={column}>{String(row[column] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function VesselLayout({
  plan,
}: {
  plan: {
    assignments: {
      container_id: string;
      position_code: string;
      occupied_positions?: string[];
      size_ft?: number;
    }[];
  } | null;
}) {

  const [slots, setSlots] = useState<
    {
      slot_id: string;
      bay: number;
      row: number;
      tier: number;
      location: "hold" | "deck";
      position_code: string;
    }[]
  >([]);
  const [selectedBay, setSelectedBay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!plan?.assignments.length) return;

    const firstAssignedPosition =
      plan.assignments[0].occupied_positions?.[0]
      ?? plan.assignments[0].position_code;

    const firstBay = Number(firstAssignedPosition?.split("-")[0]);

    if (Number.isFinite(firstBay) && firstBay > 0) {
      setSelectedBay(firstBay);
    }
  }, [plan]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/vessel/layout")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load vessel layout.");
        return response.json();
      })
      .then((data) => setSlots(data.slots ?? []))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Request failed.");
      })
      .finally(() => setLoading(false));
  }, []);

  const bays = [...new Set(slots.map((slot) => slot.bay))].sort(
    (a, b) => a - b
  );
  const baySlots = slots.filter((slot) => slot.bay === selectedBay);


  const occupiedPositions = new Map<string, string>();

  plan?.assignments.forEach((assignment) => {
    const positions = assignment.occupied_positions?.length
      ? assignment.occupied_positions
      : [assignment.position_code];

    positions.forEach((position) => {
      occupiedPositions.set(position, assignment.container_id);
    });
  });

  const occupiedCount = occupiedPositions.size;

  console.log("Assigned positions:", [...occupiedPositions.entries()]);
  console.log("Selected bay slots:", baySlots.map((slot) => slot.position_code));


  const rows = [...new Set(baySlots.map((slot) => slot.row))].sort(
    (a, b) => a - b
  );
  const tiers = [...new Set(baySlots.map((slot) => slot.tier))].sort(
    (a, b) => b - a
  );

  return (
    <div className="panel">
      <h2>Vessel Stowage Layout</h2>
      <p>Bay-by-bay view of the generated synthetic vessel.</p>

      {loading && <p>Loading vessel slots...</p>}
      {error && <p role="alert" className="plan-message">{error}</p>}

      {!loading && !error && (
        <>
          <p>Total vessel slots: {slots.length}</p>

          <p>
            Occupied positions: {occupiedCount} · Empty positions:{" "}
            {slots.length - occupiedCount}
          </p>

          <label>
            Select bay
            <select
              value={selectedBay}
              onChange={(event) => setSelectedBay(Number(event.target.value))}
            >
              {bays.map((bay) => (
                <option key={bay} value={bay}>
                  Bay {String(bay).padStart(2, "0")}
                </option>
              ))}
            </select>
          </label>

          
<div className="vessel-legend">
  <span>
    <span className="legend-color occupied" />
    Occupied Container (C)
  </span>

  <span>
    <span className="legend-color empty" />
    Empty Position (H / D)
  </span>
</div>

<p className="bay-summary">
  Selected Bay: {String(selectedBay).padStart(2, "0")}
  {" | "}
  Occupied Positions: {
    baySlots.filter((slot) =>
      occupiedPositions.has(slot.position_code)
    ).length
  }
</p>


          <div style={{ overflowX: "auto", marginTop: "20px" }}>
            <table>
              <thead>
                <tr>
                  <th>Tier / Row</th>
                  {rows.map((row) => <th key={row}>{row}</th>)}
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => (
                  <tr key={tier}>
                    <th>{tier}</th>
                    {rows.map((row) => {
                      const slot = baySlots.find(
                        (item) => item.row === row && item.tier === tier
                      );

                      return (
                        <td key={row}>

                          {slot ? (
                            <span
                              title={
                                occupiedPositions.has(slot.position_code)
                                  ? `${slot.position_code} — Container ${occupiedPositions.get(slot.position_code)}`
                                  : `${slot.position_code} — Empty`
                              }
                              style={{
                                display: "inline-block",
                                minWidth: "28px",
                                padding: "5px 3px",
                                borderRadius: "4px",
                                textAlign: "center",
                                background: occupiedPositions.has(slot.position_code)
                                  ? "#16a34a"
                                  : "#263449",
                                color: "#ffffff",
                                border: "1px solid #52647a",
                                fontSize: "12px",
                              }}
                            >
                              {occupiedPositions.has(slot.position_code)
                                ? "C"
                                : slot.location === "hold"
                                  ? "H"
                                  : "D"}
                            </span>
                          ) : "—"}

                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>H = Hold · D = Deck · — = No slot at this coordinate</p>
          <p>
            This is a synthetic slot map, not a certified representation of
            a real ship's geometry or safety constraints.
          </p>
        </>
      )}
    </div>
  );
}


export default App;
