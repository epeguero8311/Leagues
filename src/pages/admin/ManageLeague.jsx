import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { SPORT_ABBR } from "../../data/sportTemplates";
import Navbar from "../../components/Navbar";
import "./ManageLeague.css";

const TABS = ["Teams", "Players", "Schedule", "Settings"];

function slugify(name = "") {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function ManageLeague() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [league, setLeague]   = useState(null);
  const [teams, setTeams]     = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("Teams");
  const [toast, setToast]     = useState(null); // { msg, type: "error"|"success" }

  const showToast = (msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const leagueSnap = await getDoc(doc(db, "leagues", id));
      if (!leagueSnap.exists()) { navigate("/admin/dashboard"); return; }
      const leagueData = { id: leagueSnap.id, ...leagueSnap.data() };
      if (leagueData.adminId !== user.uid) { navigate("/admin/dashboard"); return; }
      setLeague(leagueData);
      const [teamsSnap, playersSnap] = await Promise.all([
        getDocs(collection(db, "leagues", id, "teams")),
        getDocs(collection(db, "leagues", id, "players")),
      ]);
      setTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPlayers(playersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!league) return null;

  const publicUrl = `${window.location.origin}/leagues/${id}/${slugify(league.name)}`;

  return (
    <div className="manage-page">
      <Navbar />
      <div className="manage-container container page-enter">

        <div className="manage-header">
          <Link to="/admin/dashboard" className="back-link">← Dashboard</Link>
          <div className="manage-title-row">
            <div className="manage-logo" style={{ background: league.color + "22", border: `2px solid ${league.color}44` }}>
              {league.logoUrl
                ? <img src={league.logoUrl} alt={league.name} />
                : <span style={{ color: league.color, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.04em" }}>
                    {SPORT_ABBR[league.sport] || "LGE"}
                  </span>
              }
            </div>
            <div>
              <h1 className="manage-title">{league.name}</h1>
              <p className="manage-meta">
                {league.sport} &middot; {league.city && `${league.city}, `}{league.state}
                &nbsp;&nbsp;
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="public-link">
                  View public page →
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="manage-tabs">
          {TABS.map(t => (
            <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t}
              {t === "Teams"   && <span className="tab-count">{teams.length}</span>}
              {t === "Players" && <span className="tab-count">{players.length}</span>}
            </button>
          ))}
        </div>

        <div className="manage-content">
          {tab === "Teams"    && <TeamsTab    league={league} teams={teams} setTeams={setTeams} players={players} leagueId={id} showToast={showToast} />}
          {tab === "Players"  && <PlayersTab  league={league} players={players} setPlayers={setPlayers} teams={teams} leagueId={id} showToast={showToast} />}
          {tab === "Schedule" && <ScheduleTab league={league} teams={teams} leagueId={id} showToast={showToast} />}
          {tab === "Settings" && <SettingsTab league={league} setLeague={setLeague} leagueId={id} navigate={navigate} publicUrl={publicUrl} showToast={showToast} />}
        </div>

        {/* Toast notifications */}
        {toast && (
          <div className={`toast-banner ${toast.type}`}>
            {toast.type === "error" ? "⚠️" : "✓"} {toast.msg}
          </div>
        )}

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   TEAMS TAB
═══════════════════════════════════════ */
function TeamsTab({ teams, setTeams, players, leagueId, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [name, setName]         = useState("");
  const [color, setColor]       = useState("#607D8B");
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState("");

  const openAdd  = () => { setEditTeam(null); setName(""); setColor("#607D8B"); setShowForm(true); };
  const openEdit = (t) => { setEditTeam(t); setName(t.name); setColor(t.color); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditTeam(null); };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editTeam) {
        await updateDoc(doc(db, "leagues", leagueId, "teams", editTeam.id), { name: name.trim(), color });
        setTeams(prev => prev.map(t => t.id === editTeam.id ? { ...t, name: name.trim(), color } : t));
      } else {
        const docRef = await addDoc(collection(db, "leagues", leagueId, "teams"), { name: name.trim(), color, createdAt: serverTimestamp() });
        setTeams(prev => [...prev, { id: docRef.id, name: name.trim(), color }]);
      }
      closeForm();
    } catch (err) { console.error(err); showToast("Failed to save team. Please try again."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (teamId) => {
    if (!confirm("Delete this team? Players assigned to it will remain.")) return;
    try {
      await deleteDoc(doc(db, "leagues", leagueId, "teams", teamId));
      setTeams(prev => prev.filter(t => t.id !== teamId));
    } catch (err) { console.error(err); showToast("Failed to delete team."); }
  };

  return (
    <div className="tab-body">
      <div className="tab-toolbar">
        <h3 className="tab-section-title">Teams <span className="count-badge">{teams.length}</span></h3>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Team</button>
      </div>

      <div className="search-bar-wrap">
        <span className="search-icon">🔍</span>
        <input
          className="search-bar"
          placeholder="Search teams..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className="search-clear" onClick={() => setSearch("")}>✕</button>}
      </div>

      {showForm && (
        <div className="inline-form card">
          <h4 className="inline-form-title">{editTeam ? "Edit Team" : "New Team"}</h4>
          <div className="inline-form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Team Name <span className="req">*</span></label>
              <input className="form-input" placeholder="e.g. Los Tigres" value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div className="color-row-sm">
                <input type="color" className="color-picker-sm" value={color} onChange={e => setColor(e.target.value)} />
                <span style={{ fontSize: "0.8rem", color: "var(--c-text2)", fontFamily: "monospace" }}>{color.toUpperCase()}</span>
              </div>
            </div>
          </div>
          <div className="inline-form-actions">
            <button className="btn btn-secondary" onClick={closeForm}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "Saving..." : editTeam ? "Save Changes" : "Add Team"}
            </button>
          </div>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="empty-state"><p className="empty-title">No teams yet</p><p className="empty-sub">Add your first team to get started.</p></div>
      ) : (
        <div className="teams-list">
          {teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase())).map(team => {
            const teamPlayers = players.filter(p => p.teamId === team.id);
            return (
              <div key={team.id} className="team-row">
                <div className="team-row-left">
                  <span className="team-color-dot" style={{ background: team.color }} />
                  <div>
                    <p className="team-name">{team.name}</p>
                    <p className="team-player-count">{teamPlayers.length} player{teamPlayers.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="row-actions">
                  <button className="text-btn" onClick={() => openEdit(team)}>Edit</button>
                  <button className="text-btn danger" onClick={() => handleDelete(team.id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   PLAYERS TAB
═══════════════════════════════════════ */
function PlayersTab({ players, setPlayers, teams, leagueId, showToast }) {
  const [showForm, setShowForm]     = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [filter, setFilter]         = useState("all");
  const [search, setSearch]         = useState("");
  const [form, setForm] = useState({
    firstName: "", lastName: "", teamId: "", jerseyNumber: "",
    position: "", bio: "", photoFile: null, photoPreview: null, notes: []
  });
  const [newNote, setNewNote] = useState("");

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd  = () => {
    setEditPlayer(null);
    setForm({ firstName: "", lastName: "", teamId: "", jerseyNumber: "", position: "", bio: "", photoFile: null, photoPreview: null, notes: [] });
    setNewNote("");
    setShowForm(true);
  };
  const openEdit = (p) => {
    setEditPlayer(p);
    setForm({
      firstName: p.firstName, lastName: p.lastName, teamId: p.teamId || "",
      jerseyNumber: p.jerseyNumber || "", position: p.position || "",
      bio: p.bio || "", photoFile: null, photoPreview: p.photoUrl || null,
      notes: p.notes || []
    });
    setNewNote("");
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditPlayer(null); setNewNote(""); };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setF("photoFile", file);
    setF("photoPreview", URL.createObjectURL(file));
  };

  const addNote = () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;
    setF("notes", [...form.notes, trimmed]);
    setNewNote("");
  };

  const removeNote = (idx) => {
    setF("notes", form.notes.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    setSaving(true);
    try {
      let photoUrl = editPlayer?.photoUrl || null;
      if (form.photoFile) {
        try {
          const photoRef = ref(storage, `players/${leagueId}/${Date.now()}_${form.photoFile.name}`);
          await uploadBytes(photoRef, form.photoFile);
          photoUrl = await getDownloadURL(photoRef);
        } catch (e) { console.warn("Photo upload failed:", e.message); }
      }
      const data = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        teamId: form.teamId || null,
        jerseyNumber: form.jerseyNumber.trim(),
        position: form.position.trim(),
        bio: form.bio.trim(),
        notes: form.notes,
        photoUrl
      };
      if (editPlayer) {
        await updateDoc(doc(db, "leagues", leagueId, "players", editPlayer.id), data);
        setPlayers(prev => prev.map(p => p.id === editPlayer.id ? { ...p, ...data } : p));
      } else {
        const docRef = await addDoc(collection(db, "leagues", leagueId, "players"), { ...data, createdAt: serverTimestamp() });
        setPlayers(prev => [...prev, { id: docRef.id, ...data }]);
      }
      closeForm();
    } catch (err) { console.error(err); showToast("Failed to save player. Please try again."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (playerId) => {
    if (!confirm("Remove this player?")) return;
    try {
      await deleteDoc(doc(db, "leagues", leagueId, "players", playerId));
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    } catch (err) { console.error(err); showToast("Failed to remove player."); }
  };

  const filtered = (filter === "all" ? players : players.filter(p => p.teamId === filter))
    .filter(p => {
      const q = search.toLowerCase();
      return !q || `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
        || (p.position || "").toLowerCase().includes(q)
        || (p.jerseyNumber || "").includes(q);
    });
  const getTeam  = (teamId) => teams.find(t => t.id === teamId);

  return (
    <div className="tab-body">
      <div className="tab-toolbar">
        <h3 className="tab-section-title">Players <span className="count-badge">{players.length}</span></h3>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Player</button>
      </div>

      {teams.length > 0 && (
        <div className="filter-row">
          <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All Teams</button>
          {teams.map(t => (
            <button key={t.id} className={`filter-btn ${filter === t.id ? "active" : ""}`} onClick={() => setFilter(t.id)}>
              <span className="filter-dot" style={{ background: t.color }} />{t.name}
            </button>
          ))}
        </div>
      )}

      <div className="search-bar-wrap">
        <span className="search-icon">🔍</span>
        <input
          className="search-bar"
          placeholder="Search by name, position, or jersey #..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className="search-clear" onClick={() => setSearch("")}>✕</button>}
      </div>

      {showForm && (
        <div className="inline-form card player-form">
          <h4 className="inline-form-title">{editPlayer ? "Edit Player" : "Add Player"}</h4>
          <div className="player-form-grid">
            <div className="form-group">
              <label className="form-label">First Name <span className="req">*</span></label>
              <input className="form-input" placeholder="First name" value={form.firstName} onChange={e => setF("firstName", e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name <span className="req">*</span></label>
              <input className="form-input" placeholder="Last name" value={form.lastName} onChange={e => setF("lastName", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Team <span className="opt">Optional</span></label>
              <select className="form-input" value={form.teamId} onChange={e => setF("teamId", e.target.value)}>
                <option value="">No team assigned</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Jersey # <span className="opt">Optional</span></label>
              <input className="form-input" placeholder="e.g. 10" value={form.jerseyNumber} onChange={e => setF("jerseyNumber", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Position <span className="opt">Optional</span></label>
              <input className="form-input" placeholder="e.g. Forward" value={form.position} onChange={e => setF("position", e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Bio <span className="opt">Optional</span></label>
              <textarea className="form-input form-textarea" rows={2} placeholder="Short bio..." value={form.bio} onChange={e => setF("bio", e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Photo <span className="opt">Optional</span></label>
              {form.photoPreview ? (
                <div className="player-photo-preview-row">
                  <img src={form.photoPreview} className="player-photo-preview" alt="Preview" />
                  <button className="btn btn-secondary" type="button" onClick={() => { setF("photoFile", null); setF("photoPreview", null); }}>Remove</button>
                </div>
              ) : (
                <label className="photo-upload-box">
                  <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
                  <span>Click to upload a photo</span>
                </label>
              )}
            </div>

            {/* ── Notes ── */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">
                Notes <span className="opt">Optional</span>
                <span className="form-label-hint"> — e.g. "May 3 — rest 1 game (4 yellows)"</span>
              </label>

              {/* Existing notes */}
              {form.notes.length > 0 && (
                <div className="notes-list-admin">
                  {form.notes.map((note, idx) => (
                    <div key={idx} className="note-admin-row">
                      <span className="note-admin-bullet" />
                      <span className="note-admin-text">{note}</span>
                      <button
                        className="note-remove-btn"
                        type="button"
                        onClick={() => removeNote(idx)}
                        title="Remove note"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new note */}
              <div className="note-add-row">
                <input
                  className="form-input"
                  placeholder='e.g. May 3 — rest 1 game (4 yellows)'
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNote(); } }}
                />
                <button
                  className="btn btn-secondary note-add-btn"
                  type="button"
                  onClick={addNote}
                  disabled={!newNote.trim()}
                >
                  Add
                </button>
              </div>
              <p className="form-hint">Press Enter or click Add to add a note. Each note is a separate line.</p>
            </div>
          </div>

          <div className="inline-form-actions">
            <button className="btn btn-secondary" onClick={closeForm}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.firstName.trim() || !form.lastName.trim()}>
              {saving ? "Saving..." : editPlayer ? "Save Changes" : "Add Player"}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state"><p className="empty-title">No players yet</p><p className="empty-sub">Add players and assign them to teams.</p></div>
      ) : (
        <div className="players-table-wrap">
          <table className="players-table">
            <thead>
              <tr><th>Player</th><th>Team</th><th>Position</th><th>#</th><th>Notes</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const team = getTeam(p.teamId);
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="player-name-cell">
                        <div className="player-avatar">
                          {p.photoUrl ? <img src={p.photoUrl} alt={p.firstName} /> : <span>{p.firstName[0]}{p.lastName[0]}</span>}
                        </div>
                        <span className="player-full-name">{p.firstName} {p.lastName}</span>
                      </div>
                    </td>
                    <td>
                      {team
                        ? <span className="team-pill" style={{ borderColor: team.color + "55", color: team.color }}>
                            <span className="team-pill-dot" style={{ background: team.color }} />{team.name}
                          </span>
                        : <span className="no-team">—</span>
                      }
                    </td>
                    <td className="text-muted">{p.position || "—"}</td>
                    <td className="text-muted">{p.jerseyNumber || "—"}</td>
                    <td>
                      {p.notes?.length > 0
                        ? <span className="notes-count-badge">{p.notes.length} note{p.notes.length !== 1 ? "s" : ""}</span>
                        : <span className="text-muted">—</span>
                      }
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="text-btn" onClick={() => openEdit(p)}>Edit</button>
                        <button className="text-btn danger" onClick={() => handleDelete(p.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   SCHEDULE TAB
═══════════════════════════════════════ */
function ScheduleTab({ league, teams, leagueId, showToast }) {
  const [games, setGames]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editGame, setEditGame]   = useState(null);
  const [scoreGameId, setScoreGameId] = useState(null);
  const [search, setSearch]           = useState("");
  const [form, setForm] = useState({ homeTeamId: "", awayTeamId: "", date: "", time: "", location: "" });

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    getDocs(collection(db, "leagues", leagueId, "games"))
      .then(snap => {
        const g = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        g.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
        setGames(g);
      })
      .finally(() => setLoading(false));
  }, [leagueId]);

  const openAdd = () => { setEditGame(null); setForm({ homeTeamId: "", awayTeamId: "", date: "", time: "", location: "" }); setShowForm(true); setScoreGameId(null); };
  const openEditGame = (g) => { setEditGame(g); setForm({ homeTeamId: g.homeTeamId, awayTeamId: g.awayTeamId, date: g.date, time: g.time, location: g.location || "" }); setShowForm(true); setScoreGameId(null); };
  const openScore = (gameId) => { setScoreGameId(prev => prev === gameId ? null : gameId); setShowForm(false); };

  const handleSaveGame = async () => {
    if (!form.homeTeamId || !form.awayTeamId || !form.date || !form.time) return;
    setSaving(true);
    try {
      if (editGame) {
        await updateDoc(doc(db, "leagues", leagueId, "games", editGame.id), { homeTeamId: form.homeTeamId, awayTeamId: form.awayTeamId, date: form.date, time: form.time, location: form.location.trim() });
        setGames(prev => prev.map(g => g.id === editGame.id ? { ...g, ...form } : g).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
      } else {
        const docRef = await addDoc(collection(db, "leagues", leagueId, "games"), { homeTeamId: form.homeTeamId, awayTeamId: form.awayTeamId, date: form.date, time: form.time, location: form.location.trim(), homeScore: null, awayScore: null, status: "upcoming", createdAt: serverTimestamp() });
        setGames(prev => [...prev, { id: docRef.id, ...form, homeScore: null, awayScore: null, status: "upcoming" }].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
      }
      setShowForm(false); setEditGame(null);
    } catch (err) { console.error(err); showToast("Failed to save game. Please try again."); }
    finally { setSaving(false); }
  };

  const handleDeleteGame = async (gameId) => {
    if (!confirm("Delete this game?")) return;
    try {
      await deleteDoc(doc(db, "leagues", leagueId, "games", gameId));
      setGames(prev => prev.filter(g => g.id !== gameId));
      if (scoreGameId === gameId) setScoreGameId(null);
    } catch (err) { console.error(err); showToast("Failed to delete game."); }
  };

  const handleSaveScore = async (gameId, homeScore, awayScore, playerStats, gameNotes) => {
    try {
      const updateData = { homeScore, awayScore, status: "completed", gameNotes: gameNotes || "", ...(playerStats ? { playerStats } : {}) };
      await updateDoc(doc(db, "leagues", leagueId, "games", gameId), updateData);
      setGames(prev => prev.map(g => g.id === gameId ? { ...g, ...updateData } : g));
      setScoreGameId(null);
      showToast("Score saved!", "success");
    } catch (err) { console.error(err); showToast("Failed to save score. Please try again."); }
  };

  const getTeam = (tid) => teams.find(t => t.id === tid);

  const filterGames = (list) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(g => {
      const home = getTeam(g.homeTeamId)?.name || "";
      const away = getTeam(g.awayTeamId)?.name || "";
      return home.toLowerCase().includes(q) || away.toLowerCase().includes(q) || (g.location || "").toLowerCase().includes(q) || (g.date || "").includes(q);
    });
  };

  const upcoming  = filterGames(games.filter(g => g.status !== "completed"));
  const completed = filterGames(games.filter(g => g.status === "completed"));

  return (
    <div className="tab-body">
      <div className="tab-toolbar">
        <h3 className="tab-section-title">Schedule <span className="count-badge">{games.length}</span></h3>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Game</button>
      </div>

      <div className="search-bar-wrap">
        <span className="search-icon">🔍</span>
        <input
          className="search-bar"
          placeholder="Search by team, location, or date..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className="search-clear" onClick={() => setSearch("")}>✕</button>}
      </div>

      {showForm && (
        <div className="inline-form card">
          <h4 className="inline-form-title">{editGame ? "Edit Game" : "New Game"}</h4>
          <div className="game-form-grid">
            <div className="form-group">
              <label className="form-label">Home Team <span className="req">*</span></label>
              <select className="form-input" value={form.homeTeamId} onChange={e => setF("homeTeamId", e.target.value)}>
                <option value="">Select team...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Away Team <span className="req">*</span></label>
              <select className="form-input" value={form.awayTeamId} onChange={e => setF("awayTeamId", e.target.value)}>
                <option value="">Select team...</option>
                {teams.filter(t => t.id !== form.homeTeamId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date <span className="req">*</span></label>
              <input type="date" className="form-input" value={form.date} onChange={e => setF("date", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Time <span className="req">*</span></label>
              <input type="time" className="form-input" value={form.time} onChange={e => setF("time", e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Location <span className="opt">Optional</span></label>
              <input className="form-input" placeholder="e.g. Memorial Park Field 3" value={form.location} onChange={e => setF("location", e.target.value)} />
            </div>
          </div>
          <div className="inline-form-actions">
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditGame(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveGame} disabled={saving || !form.homeTeamId || !form.awayTeamId || !form.date || !form.time}>
              {saving ? "Saving..." : editGame ? "Save Changes" : "Add Game"}
            </button>
          </div>
        </div>
      )}

      {games.length === 0 && !loading ? (
        <div className="empty-state">
          <p className="empty-title">No games scheduled</p>
          <p className="empty-sub">Add your first game to build out the schedule.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="schedule-section">
              <p className="schedule-section-label">Upcoming</p>
              <div className="games-list">
                {upcoming.map(game => (
                  <GameRowWithScore
                    key={game.id}
                    game={game}
                    getTeam={getTeam}
                    league={league}
                    leagueId={leagueId}
                    isScoreOpen={scoreGameId === game.id}
                    onToggleScore={() => openScore(game.id)}
                    onEdit={() => openEditGame(game)}
                    onDelete={() => handleDeleteGame(game.id)}
                    onSaveScore={handleSaveScore}
                  />
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div className="schedule-section">
              <p className="schedule-section-label">Completed</p>
              <div className="games-list">
                {completed.map(game => (
                  <GameRowWithScore
                    key={game.id}
                    game={game}
                    getTeam={getTeam}
                    league={league}
                    leagueId={leagueId}
                    isScoreOpen={scoreGameId === game.id}
                    onToggleScore={() => openScore(game.id)}
                    onEdit={() => openEditGame(game)}
                    onDelete={() => handleDeleteGame(game.id)}
                    onSaveScore={handleSaveScore}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GameRowWithScore({ game, getTeam, league, leagueId, isScoreOpen, onToggleScore, onEdit, onDelete, onSaveScore }) {
  const home    = getTeam(game.homeTeamId);
  const away    = getTeam(game.awayTeamId);
  const dateStr = game.date ? new Date(game.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const timeStr = game.time ? new Date("2000-01-01T" + game.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";

  const [homeScore, setHomeScore]     = useState(game.homeScore != null ? String(game.homeScore) : "");
  const [awayScore, setAwayScore]     = useState(game.awayScore != null ? String(game.awayScore) : "");
  const [playerStats, setPlayerStats] = useState(game.playerStats || {});
  const [gameNotes, setGameNotes]     = useState(game.gameNotes || "");
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [loadedPlayers, setLoadedPlayers] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [attempted, setAttempted]     = useState(false);

  useEffect(() => {
    if (!isScoreOpen) setAttempted(false);
  }, [isScoreOpen]);

  // Sync form state when game data changes (e.g. after a save)
  useEffect(() => {
    setHomeScore(game.homeScore != null ? String(game.homeScore) : "");
    setAwayScore(game.awayScore != null ? String(game.awayScore) : "");
    setPlayerStats(game.playerStats || {});
    setGameNotes(game.gameNotes || "");
  }, [game.id, game.homeScore, game.awayScore, game.gameNotes]);

  const statCategories = league.statCategories || [];

  useEffect(() => {
    if (!isScoreOpen) return;
    // Always reload players when the panel opens so roster changes are reflected
    getDocs(collection(db, "leagues", leagueId, "players")).then(snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setHomePlayers(all.filter(p => p.teamId === game.homeTeamId));
      setAwayPlayers(all.filter(p => p.teamId === game.awayTeamId));
      setLoadedPlayers(true);
    }).catch(console.error);
  }, [isScoreOpen]);

  const setStat = (pid, key, val) => setPlayerStats(prev => ({
    ...prev, [pid]: { ...(prev[pid] || {}), [key]: val }
  }));

  const getStatVal = (pid, key) => {
    const v = playerStats[pid]?.[key];
    return v === undefined || v === null ? "" : String(v);
  };

  const handleSave = async () => {
    setAttempted(true);
    if (homeScore === "" || awayScore === "") return;
    setSaving(true);
    try {
      const clean = {};
      Object.entries(playerStats).forEach(([pid, stats]) => {
        const c = {};
        Object.entries(stats).forEach(([k, v]) => { if (v !== "" && !isNaN(Number(v))) c[k] = Number(v); });
        if (Object.keys(c).length) clean[pid] = c;
      });
      await onSaveScore(game.id, Number(homeScore), Number(awayScore), clean, gameNotes.trim());
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
    setSaving(false);
  };

  const canSave = homeScore !== "" && awayScore !== "" && !isNaN(Number(homeScore)) && !isNaN(Number(awayScore));

  return (
    <div className={`game-entry ${game.status === "completed" ? "completed" : ""}`}>
      <div className="game-row">
        <div className="game-teams">
          <span className="game-team-name">{home?.name || "TBD"}</span>
          {game.status === "completed"
            ? <span className="game-score">{game.homeScore} – {game.awayScore}</span>
            : <span className="game-vs">vs</span>
          }
          <span className="game-team-name">{away?.name || "TBD"}</span>
        </div>
        <div className="game-meta">
          <span>{dateStr}</span>
          {timeStr && <span>&middot; {timeStr}</span>}
          {game.location && <span>&middot; {game.location}</span>}
        </div>
        <div className="game-actions">
          <button className={`text-btn ${isScoreOpen ? "active-btn" : ""}`} onClick={onToggleScore}>
            {isScoreOpen ? "Cancel" : game.status === "completed" ? "Edit Score" : "Enter Score"}
          </button>
          <button className="text-btn" onClick={onEdit}>Edit</button>
          <button className="text-btn danger" onClick={onDelete}>Delete</button>
        </div>
      </div>

      {isScoreOpen && (
        <div className="score-inline-form">
          <div className="score-inline-header">
            <h4 className="score-inline-title">Score & Stats</h4>
          </div>

          <div className="score-inline-scores">
            <div className="score-inline-block">
              <label className="form-label">{home?.name}</label>
              <input
                className={`form-input score-inline-input${attempted && homeScore === "" ? " error" : ""}`}
                inputMode="numeric"
                placeholder="0"
                value={homeScore}
                onChange={e => { if (/^\d*$/.test(e.target.value)) setHomeScore(e.target.value); }}
              />
            </div>
            <span className="score-inline-dash">–</span>
            <div className="score-inline-block">
              <label className="form-label">{away?.name}</label>
              <input
                className={`form-input score-inline-input${attempted && awayScore === "" ? " error" : ""}`}
                inputMode="numeric"
                placeholder="0"
                value={awayScore}
                onChange={e => { if (/^\d*$/.test(e.target.value)) setAwayScore(e.target.value); }}
              />
            </div>
          </div>
          {attempted && (homeScore === "" || awayScore === "") && (
            <p className="score-error-msg">Both scores are required before saving.</p>
          )}

          {statCategories.length > 0 && (
            <div className="score-inline-stats">
              <p className="score-inline-stats-label">Player Stats <span className="opt">Optional</span></p>
              {!loadedPlayers ? (
                <div className="score-inline-loading"><div className="spinner" /></div>
              ) : (
                [{ label: home?.name, players: homePlayers }, { label: away?.name, players: awayPlayers }].map(({ label, players }) =>
                  players.length > 0 && (
                    <div key={label} className="score-inline-team">
                      <p className="score-inline-team-label">{label}</p>
                      <div className="score-stats-table-wrap">
                        <table className="score-stats-table">
                          <thead>
                            <tr>
                              <th>Player</th>
                              {statCategories.map(s => <th key={s.key}>{s.label}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {players.map(p => (
                              <tr key={p.id}>
                                <td>
                                  <div className="score-player-cell">
                                    <div className="player-avatar sm">
                                      {p.photoUrl ? <img src={p.photoUrl} alt="" /> : <span>{p.firstName[0]}{p.lastName[0]}</span>}
                                    </div>
                                    {p.firstName} {p.lastName}
                                    {p.jerseyNumber && <span className="jersey-num"> #{p.jerseyNumber}</span>}
                                  </div>
                                </td>
                                {statCategories.map(s => (
                                  <td key={s.key}>
                                    <input
                                      className="score-stat-input"
                                      inputMode="numeric"
                                      placeholder="—"
                                      value={getStatVal(p.id, s.key)}
                                      onChange={e => { if (/^\d*$/.test(e.target.value)) setStat(p.id, s.key, e.target.value); }}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          )}

          {/* Game Notes */}
          <div className="score-inline-game-notes">
            <label className="score-inline-stats-label">
              Game Notes <span className="opt">Optional</span>
            </label>
            <textarea
              className="form-input score-game-notes-input"
              rows={3}
              placeholder="e.g. Great match, came back from 2–0 down. Ramirez had a hat-trick. Ref gave 3 yellows in the 2nd half..."
              value={gameNotes}
              onChange={e => setGameNotes(e.target.value)}
            />
          </div>

          <div className="score-inline-actions">
            <button className="btn btn-secondary" onClick={onToggleScore}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!canSave || saving}>
              {saving ? "Saving..." : "Save Score & Stats"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   SETTINGS TAB
═══════════════════════════════════════ */
function SettingsTab({ league, setLeague, leagueId, navigate, publicUrl, showToast }) {
  const [form, setForm]     = useState({ name: league.name, description: league.description || "", city: league.city || "", color: league.color || "#607D8B" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [copied, setCopied] = useState(false);

  const [stats, setStats]         = useState(league.statCategories || []);
  const [savingStats, setSavingStats] = useState(false);
  const [savedStats, setSavedStats]   = useState(false);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const updated = { name: form.name.trim(), description: form.description.trim(), city: form.city.trim(), color: form.color };
      await updateDoc(doc(db, "leagues", leagueId), updated);
      setLeague(l => ({ ...l, ...updated }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { console.error(err); showToast("Failed to save league info."); }
    finally { setSaving(false); }
  };

  const handleCopy = () => { navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleDelete = async () => {
    if (!confirm("Permanently delete this league and all its data? This cannot be undone.")) return;
    if (!confirm("Are you sure? All teams, players, and games will be deleted.")) return;
    try {
      // Delete all subcollections first
      const [teamsSnap, playersSnap, gamesSnap] = await Promise.all([
        getDocs(collection(db, "leagues", leagueId, "teams")),
        getDocs(collection(db, "leagues", leagueId, "players")),
        getDocs(collection(db, "leagues", leagueId, "games")),
      ]);
      await Promise.all([
        ...teamsSnap.docs.map(d => deleteDoc(d.ref)),
        ...playersSnap.docs.map(d => deleteDoc(d.ref)),
        ...gamesSnap.docs.map(d => deleteDoc(d.ref)),
      ]);
      await deleteDoc(doc(db, "leagues", leagueId));
      navigate("/admin/dashboard");
    } catch (err) { console.error(err); showToast("Failed to delete league. Please try again."); }
  };

  const addStat = () => setStats(prev => [...prev, { key: `stat_${Date.now()}`, label: "", type: "number" }]);
  const removeStat = (idx) => setStats(prev => prev.filter((_, i) => i !== idx));
  const updateStatLabel = (idx, label) => setStats(prev => prev.map((s, i) => {
    if (i !== idx) return s;
    const baseKey = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || s.key;
    // ensure uniqueness among other stats
    const isDupe = prev.some((other, j) => j !== i && other.key === baseKey);
    return { ...s, label, key: isDupe ? `${baseKey}_${idx}` : baseKey };
  }));

  const handleSaveStats = async () => {
    setSavingStats(true);
    try {
      const clean = stats.filter(s => s.label.trim());
      await updateDoc(doc(db, "leagues", leagueId), { statCategories: clean });
      setLeague(l => ({ ...l, statCategories: clean }));
      setStats(clean);
      setSavedStats(true);
      setTimeout(() => setSavedStats(false), 2500);
    } catch (err) { console.error(err); showToast("Failed to save stat categories."); }
    finally { setSavingStats(false); }
  };

  return (
    <div className="tab-body">
      <div className="settings-section card">
        <h4 className="settings-section-title">League Info</h4>
        <div className="settings-form">
          <div className="form-group">
            <label className="form-label">League Name</label>
            <input className="form-input" value={form.name} onChange={e => setF("name", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input form-textarea" rows={3} value={form.description} onChange={e => setF("description", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input className="form-input" value={form.city} onChange={e => setF("city", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">League Color</label>
            <div className="settings-color-row">
              <input
                type="color"
                className="color-picker-sm"
                value={form.color}
                onChange={e => setF("color", e.target.value)}
              />
              <span className="settings-color-preview" style={{ background: form.color }} />
              <span style={{ fontSize: "0.82rem", color: "var(--c-text2)", fontFamily: "monospace" }}>
                {form.color.toUpperCase()}
              </span>
              <span className="settings-color-hint">Used for the public page accent, badges, and highlights</span>
            </div>
          </div>
          <div className="settings-save-row">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section card">
        <h4 className="settings-section-title">Stat Categories</h4>
        <p className="settings-hint">
          These are the stats tracked per player per game. They show up when you enter a score and on each player's public profile.
        </p>
        <div className="stat-list">
          {stats.map((stat, idx) => (
            <div key={idx} className="stat-row">
              <input
                className="form-input stat-input"
                value={stat.label}
                onChange={e => updateStatLabel(idx, e.target.value)}
                placeholder="Stat name (e.g. Goals, Assists, Yellow Cards)"
              />
              <button className="stat-remove-btn" onClick={() => removeStat(idx)}>Remove</button>
            </div>
          ))}
        </div>
        <div className="stat-footer-row">
          <button className="btn btn-secondary" onClick={addStat}>+ Add Stat</button>
          <button className="btn btn-primary" onClick={handleSaveStats} disabled={savingStats}>
            {savingStats ? "Saving..." : savedStats ? "Saved!" : "Save Stats"}
          </button>
        </div>
      </div>

      <div className="settings-section card">
        <h4 className="settings-section-title">Public Link</h4>
        <p className="settings-hint">Share this with players and fans. No account needed to view.</p>
        <div className="public-link-row">
          <input className="form-input public-url-input" value={publicUrl} readOnly />
          <button className="btn btn-secondary" onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</button>
        </div>
      </div>

      <div className="settings-section card danger-zone">
        <h4 className="settings-section-title danger-title">Danger Zone</h4>
        <div className="danger-row">
          <div>
            <p className="danger-label">Delete League</p>
            <p className="danger-sub">Permanently deletes this league, all teams, players, and games.</p>
          </div>
          <button className="btn btn-danger" onClick={handleDelete}>Delete League</button>
        </div>
      </div>
    </div>
  );
}