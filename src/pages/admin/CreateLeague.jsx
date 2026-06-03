import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { SPORTS, SPORT_STAT_TEMPLATES, US_STATES } from "../../data/sportTemplates";
import Navbar from "../../components/Navbar";
import "./CreateLeague.css";

const STEPS = [
  { id: "basics",   title: "League Basics",    subtitle: "Tell us about your league." },
  { id: "location", title: "Location",         subtitle: "Where is the league based?" },
  { id: "sport",    title: "Sport & Stats",    subtitle: "Pick your sport and review the stat categories." },
  { id: "branding", title: "Branding",         subtitle: "Give your league a look. All optional." },
  { id: "review",   title: "Review & Create",  subtitle: "Everything look good?" },
];

export default function CreateLeague() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    state: "",
    city: "",
    sport: "",
    statCategories: [],
    color: "#607D8B",
    logoFile: null,
    logoPreview: null,
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSportSelect = (sport) => {
    set("sport", sport);
    set("statCategories", (SPORT_STAT_TEMPLATES[sport] || []).map(s => ({ ...s })));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    set("logoFile", file);
    set("logoPreview", URL.createObjectURL(file));
  };

  const addStat = () => {
    set("statCategories", [...form.statCategories, { key: `custom_${Date.now()}`, label: "", type: "number" }]);
  };

  const removeStat = (idx) => {
    set("statCategories", form.statCategories.filter((_, i) => i !== idx));
  };

  const updateStatLabel = (idx, label) => {
    const updated = [...form.statCategories];
    updated[idx] = { ...updated[idx], label, key: label.toLowerCase().replace(/\s+/g, "_") };
    set("statCategories", updated);
  };

  const canProceed = () => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return form.state.length > 0;
    if (step === 2) return form.sport.length > 0;
    return true;
  };

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    let logoUrl = null;

    // Try logo upload — if Storage rules block it, skip and continue without logo
    if (form.logoFile) {
      try {
        const logoRef = ref(storage, `leagues/${user.uid}/${Date.now()}_${form.logoFile.name}`);
        await uploadBytes(logoRef, form.logoFile);
        logoUrl = await getDownloadURL(logoRef);
      } catch (uploadErr) {
        console.warn("Logo upload failed, skipping:", uploadErr.code, uploadErr.message);
        // Fix: Firebase Console > Storage > Rules > set: allow read, write: if request.auth != null;
      }
    }

    try {
      const docRef = await addDoc(collection(db, "leagues"), {
        name: form.name.trim(),
        description: form.description.trim(),
        state: form.state,
        city: form.city.trim(),
        sport: form.sport,
        statCategories: form.statCategories.filter(s => s.label.trim()),
        color: form.color,
        logoUrl,
        adminId: user.uid,
        isPublic: true,
        createdAt: serverTimestamp(),
      });
      navigate(`/admin/leagues/${docRef.id}`);
    } catch (err) {
      console.error("League creation failed:", err.code, err.message);
      const msg = err.code === "permission-denied"
        ? "Permission denied. Check that your Firestore rules are published in Firebase Console."
        : `Something went wrong: ${err.message}`;
      setError(msg);
      setSaving(false);
    }
  };

  return (
    <div className="create-league-page">
      <Navbar />
      <div className="create-league-container container page-enter">

        <Link to="/admin/dashboard" className="back-link">← Back to Dashboard</Link>

        {/* Progress bar */}
        <div className="progress-bar-wrap">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`progress-step ${i < step ? "done" : ""} ${i === step ? "active" : ""}`}
              onClick={() => i < step && setStep(i)}
            >
              <div className="progress-dot">
                {i < step ? <CheckIcon /> : <span>{i + 1}</span>}
              </div>
              <span className="progress-label">{s.title}</span>
            </div>
          ))}
          <div className="progress-line">
            <div className="progress-line-fill" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
          </div>
        </div>

        {/* Card */}
        <div className="create-card card">
          <div className="create-card-header">
            <h2 className="create-step-title">{STEPS[step].title}</h2>
            <p className="create-step-sub">{STEPS[step].subtitle}</p>
          </div>

          {/* ── Step 0: Basics ── */}
          {step === 0 && (
            <div className="step-body">
              <div className="form-group">
                <label className="form-label">League Name <span className="req">*</span></label>
                <input
                  className="form-input form-input-lg"
                  placeholder="e.g. Houston Adult Soccer League – Fall 2026"
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                  autoFocus
                />
                <span className="field-hint">This is what players will see on the public page.</span>
              </div>

              <div className="form-group optional-group">
                <label className="form-label">Description <span className="opt">Optional</span></label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="A short description of your league, season info, or any notes for players..."
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ── Step 1: Location ── */}
          {step === 1 && (
            <div className="step-body">
              <div className="form-group">
                <label className="form-label">State <span className="req">*</span></label>
                <select
                  className="form-input"
                  value={form.state}
                  onChange={e => set("state", e.target.value)}
                >
                  <option value="">Select a state...</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="field-hint">Used so fans can find your league by searching their state.</span>
              </div>

              <div className="form-group optional-group">
                <label className="form-label">City <span className="opt">Optional</span></label>
                <input
                  className="form-input"
                  placeholder="e.g. Houston"
                  value={form.city}
                  onChange={e => set("city", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Sport & Stats ── */}
          {step === 2 && (
            <div className="step-body">
              <div className="form-group">
                <label className="form-label">Sport <span className="req">*</span></label>
                <div className="sport-grid">
                  {SPORTS.map(sport => (
                    <button
                      key={sport}
                      className={`sport-btn ${form.sport === sport ? "selected" : ""}`}
                      onClick={() => handleSportSelect(sport)}
                      type="button"
                    >
                      {sport}
                    </button>
                  ))}
                </div>
              </div>

              {form.sport && (
                <div className="stat-categories-section">
                  <div className="stat-categories-header">
                    <div>
                      <label className="form-label">Stat Categories</label>
                      <p className="field-hint" style={{ marginTop: 2 }}>
                        {form.sport === "Custom"
                          ? "Add the stats you want to track."
                          : "Pre-filled for " + form.sport + ". Remove or add as needed."}
                      </p>
                    </div>
                  </div>

                  <div className="stat-list">
                    {form.statCategories.map((stat, idx) => (
                      <div key={idx} className="stat-row">
                        <input
                          className="form-input stat-input"
                          value={stat.label}
                          onChange={e => updateStatLabel(idx, e.target.value)}
                          placeholder="Stat name"
                        />
                        <button className="stat-remove-btn" onClick={() => removeStat(idx)} type="button">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-secondary add-stat-btn" onClick={addStat} type="button">
                    + Add Stat
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Branding ── */}
          {step === 3 && (
            <div className="step-body">
              <div className="optional-notice">
                All fields on this step are optional — you can always add these later.
              </div>

              <div className="form-group">
                <label className="form-label">League Color <span className="opt">Optional</span></label>
                <div className="color-row">
                  <input
                    type="color"
                    className="color-picker"
                    value={form.color}
                    onChange={e => set("color", e.target.value)}
                  />
                  <span className="color-value">{form.color.toUpperCase()}</span>
                  <span className="field-hint" style={{ marginTop: 0 }}>Shown as an accent on your league's public page.</span>
                </div>
                <div className="color-presets">
                  {["#607D8B","#1565C0","#2E7D32","#C62828","#6A1B9A","#E65100","#333333"].map(c => (
                    <button
                      key={c}
                      className={`color-preset ${form.color === c ? "active" : ""}`}
                      style={{ background: c }}
                      onClick={() => set("color", c)}
                      type="button"
                    />
                  ))}
                </div>
              </div>

              <div className="form-group optional-group">
                <label className="form-label">League Logo <span className="opt">Optional</span></label>
                <div className="logo-upload-wrap">
                  {form.logoPreview ? (
                    <div className="logo-preview-wrap">
                      <img src={form.logoPreview} alt="Logo preview" className="logo-preview" />
                      <button
                        className="btn btn-secondary"
                        onClick={() => { set("logoFile", null); set("logoPreview", null); }}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="logo-upload-box">
                      <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: "none" }} />
                      <span className="logo-upload-icon">↑</span>
                      <span className="logo-upload-text">Click to upload a logo</span>
                      <span className="logo-upload-hint">PNG, JPG or SVG. Max 2MB.</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Review ── */}
          {step === 4 && (
            <div className="step-body">
              <div className="review-grid">
                <ReviewRow label="League Name" value={form.name} />
                <ReviewRow label="Description" value={form.description || "—"} />
                <ReviewRow label="State" value={form.state} />
                <ReviewRow label="City" value={form.city || "—"} />
                <ReviewRow label="Sport" value={form.sport} />
                <ReviewRow
                  label="Stat Categories"
                  value={form.statCategories.filter(s => s.label).map(s => s.label).join(", ") || "None"}
                />
                <div className="review-row">
                  <span className="review-label">League Color</span>
                  <span className="review-value review-color-wrap">
                    <span className="review-color-dot" style={{ background: form.color }} />
                    {form.color.toUpperCase()}
                  </span>
                </div>
                <ReviewRow label="Logo" value={form.logoPreview ? "Uploaded" : "None"} />
              </div>

              {error && <div className="create-error">{error}</div>}
            </div>
          )}

          {/* Nav buttons */}
          <div className="step-nav">
            {step > 0 && (
              <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>
                Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            {step < STEPS.length - 1 ? (
              <button
                className="btn btn-primary"
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
              >
                Continue
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? "Creating..." : "Create League"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="review-row">
      <span className="review-label">{label}</span>
      <span className="review-value">{value}</span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}