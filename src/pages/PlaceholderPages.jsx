import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";

// Public league page placeholder (Phase 4)
export function LeaguePage() {
  const { id } = useParams();
  return (
    <div>
      <Navbar />
      <div className="container page-enter" style={{ paddingTop: 60 }}>
        <div className="card" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: 60 }}>
          <span style={{ fontSize: "3rem", display: "block", marginBottom: 16 }}>🏆</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", letterSpacing: "0.05em", marginBottom: 8 }}>
            League Page
          </h2>
          <p style={{ color: "var(--c-text2)", marginBottom: 8 }}>
            League ID: <code style={{ fontFamily: "var(--font-mono)", color: "var(--c-accent)" }}>{id}</code>
          </p>
          <p style={{ color: "var(--c-text2)" }}>Coming in Phase 4 — public standings, schedule, leaderboard & players.</p>
        </div>
      </div>
    </div>
  );
}

// Admin league management placeholder (Phase 2)
export function AdminLeaguePage() {
  const { id } = useParams();
  const isNew = id === "new";
  return (
    <div>
      <Navbar />
      <div className="container page-enter" style={{ paddingTop: 60 }}>
        <Link to="/admin/dashboard" style={{ color: "var(--c-text2)", fontSize: "0.9rem", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
          ← Back to Dashboard
        </Link>
        <div className="card" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: 60 }}>
          <span style={{ fontSize: "3rem", display: "block", marginBottom: 16 }}>
            {isNew ? "✨" : "⚙️"}
          </span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", letterSpacing: "0.05em", marginBottom: 8 }}>
            {isNew ? "Create New League" : "Manage League"}
          </h2>
          <p style={{ color: "var(--c-text2)" }}>
            Coming in Phase 2 — full league setup with teams, players, stat categories & schedule.
          </p>
        </div>
      </div>
    </div>
  );
}
