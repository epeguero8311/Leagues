import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { SPORT_ABBR } from "../../data/sportTemplates";
import Navbar from "../../components/Navbar";
import "./LeaguePage.css";

const TABS = ["Standings", "Schedule", "Leaderboard", "Players"];

export default function LeaguePage() {
  const { id } = useParams();
  const [league, setLeague]   = useState(null);
  const [teams, setTeams]     = useState([]);
  const [players, setPlayers] = useState([]);
  const [games, setGames]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("Standings");
  const [notFound, setNotFound] = useState(false);
  const [descOpen, setDescOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const leagueSnap = await getDoc(doc(db, "leagues", id));
        if (!leagueSnap.exists()) { setNotFound(true); setLoading(false); return; }
        const leagueData = { id: leagueSnap.id, ...leagueSnap.data() };
        setLeague(leagueData);

        const [teamsSnap, playersSnap, gamesSnap] = await Promise.all([
          getDocs(collection(db, "leagues", id, "teams")),
          getDocs(collection(db, "leagues", id, "players")),
          getDocs(collection(db, "leagues", id, "games")),
        ]);

        setTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setPlayers(playersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const g = gamesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        g.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
        setGames(g);
      } catch (err) { console.error(err); setNotFound(true); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  if (notFound) return (
    <div className="lp-page">
      <Navbar />
      <div className="container" style={{ paddingTop: 80, textAlign: "center" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 8 }}>League not found</h2>
        <p style={{ color: "var(--c-text2)", marginBottom: 24 }}>This link may be invalid or the league was removed.</p>
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
    </div>
  );

  const accentColor = league.color || "#607D8B";

  return (
    <div className="lp-page">
      <Navbar />

      {/* League header — accent color only on the top border stripe */}
      <div className="lp-header" style={{ borderTop: `4px solid ${accentColor}` }}>
        <div className="container">

          {/* Top row */}
          <div className="lp-header-top">
            <div className="lp-logo">
              {league.logoUrl
                ? <img src={league.logoUrl} alt={league.name} />
                : <span className="lp-logo-abbr">
                    {SPORT_ABBR[league.sport] || "LGE"}
                  </span>
              }
            </div>

            <div className="lp-header-info">
              <div className="lp-sport-badge">{league.sport}</div>
              <h1 className="lp-league-name">{league.name}</h1>
              <p className="lp-league-location">
                {league.city && `${league.city}, `}{league.state}
              </p>
            </div>

            <div className="lp-header-right">
              {(league.description || teams.length > 0) && (
                <button
                  className="lp-desc-toggle"
                  onClick={() => setDescOpen(o => !o)}
                >
                  {descOpen ? "Hide info" : "About this league"}
                  <span className="lp-toggle-arrow">{descOpen ? "▲" : "▼"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Collapsible description + stats */}
          {descOpen && (
            <div className="lp-header-desc">
              <div className="lp-header-stats">
                <div className="lp-stat">
                  <span className="lp-stat-val">{teams.length}</span>
                  <span className="lp-stat-label">Teams</span>
                </div>
                <div className="lp-stat">
                  <span className="lp-stat-val">{players.length}</span>
                  <span className="lp-stat-label">Players</span>
                </div>
                <div className="lp-stat">
                  <span className="lp-stat-val">{games.filter(g => g.status === "completed").length}</span>
                  <span className="lp-stat-label">Games Played</span>
                </div>
              </div>
              {league.description && <p className="lp-desc-text">{league.description}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="lp-tabs-bar">
        <div className="container">
          <div className="lp-tabs">
            {TABS.map(t => (
              <button
                key={t}
                className={`lp-tab ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="container lp-content">
        {tab === "Standings"   && <StandingsTab   teams={teams} games={games} />}
        {tab === "Schedule"    && <ScheduleTab     teams={teams} games={games} players={players} league={league} />}
        {tab === "Leaderboard" && <LeaderboardTab  players={players} teams={teams} games={games} league={league} />}
        {tab === "Players"     && <PlayersTab      players={players} teams={teams} games={games} league={league} />}
      </div>

      <footer className="lp-footer">
        <div className="container lp-footer-inner">
          <Link to="/" className="lp-footer-brand">Tablafut</Link>
          <span className="lp-footer-copy">Public league page · No account needed</span>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════
   STANDINGS TAB
═══════════════════════════════════════ */
function StandingsTab({ teams, games }) {
  const completed = games.filter(g => g.status === "completed");

  const standings = teams.map(team => {
    const teamGames = completed.filter(g => g.homeTeamId === team.id || g.awayTeamId === team.id);
    let W = 0, L = 0, D = 0, GF = 0, GA = 0;
    teamGames.forEach(g => {
      const isHome = g.homeTeamId === team.id;
      const myScore    = isHome ? g.homeScore : g.awayScore;
      const theirScore = isHome ? g.awayScore : g.homeScore;
      GF += myScore ?? 0;
      GA += theirScore ?? 0;
      if (myScore > theirScore) W++;
      else if (myScore < theirScore) L++;
      else D++;
    });
    const played = teamGames.length;
    const pts = W * 3 + D;
    const gd = GF - GA;
    return { ...team, W, L, D, GF, GA, GD: gd, Pts: pts, played };
  });

  standings.sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF);

  if (teams.length === 0) return <EmptyState message="No teams have been added yet." />;

  return (
    <div className="lp-section">
      <div className="lp-table-wrap">
        <table className="lp-table">
          <thead>
            <tr>
              <th className="lp-th-rank">#</th>
              <th className="lp-th-team">Team</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
              <th className="lp-th-pts">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, i) => (
              <tr key={team.id} className={i === 0 && team.played > 0 ? "lp-row-top" : ""}>
                <td className="lp-td-rank">
                  <span className="lp-rank-num" style={i === 0 && team.played > 0 ? { background: "var(--jet)", color: "#fff" } : {}}>
                    {i + 1}
                  </span>
                </td>
                <td>
                  <div className="lp-team-cell">
                    <span className="lp-team-name-text">{team.name}</span>
                  </div>
                </td>
                <td className="lp-td-num">{team.played}</td>
                <td className="lp-td-num lp-td-w">{team.W}</td>
                <td className="lp-td-num">{team.D}</td>
                <td className="lp-td-num lp-td-l">{team.L}</td>
                <td className="lp-td-num">{team.GF}</td>
                <td className="lp-td-num">{team.GA}</td>
                <td className="lp-td-num">{team.GD > 0 ? `+${team.GD}` : team.GD}</td>
                <td className="lp-td-pts"><strong>{team.Pts}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lp-table-legend">
        <span>P = Played</span>
        <span>W = Won</span>
        <span>D = Drawn</span>
        <span>L = Lost</span>
        <span>GF = Goals For</span>
        <span>GA = Goals Against</span>
        <span>GD = Goal Difference</span>
        <span>Pts = Points (W=3, D=1)</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SCHEDULE TAB
═══════════════════════════════════════ */
function ScheduleTab({ teams, games, players, league }) {
  const [search, setSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const getTeam = tid => teams.find(t => t.id === tid);

  // Aggregate stats per player from completed games
  const statTotals = {};
  games.filter(g => g.status === "completed" && g.playerStats).forEach(game => {
    Object.entries(game.playerStats).forEach(([pid, stats]) => {
      if (!statTotals[pid]) statTotals[pid] = {};
      Object.entries(stats).forEach(([k, v]) => {
        statTotals[pid][k] = (statTotals[pid][k] || 0) + (Number(v) || 0);
      });
    });
  });

  const filterGames = (list) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(g => {
      const home = getTeam(g.homeTeamId)?.name || "";
      const away = getTeam(g.awayTeamId)?.name || "";
      return home.toLowerCase().includes(q) || away.toLowerCase().includes(q) || (g.location || "").toLowerCase().includes(q);
    });
  };

  const upcoming  = filterGames(games.filter(g => g.status !== "completed"));
  const completed = filterGames(games.filter(g => g.status === "completed").reverse());

  if (games.length === 0) return <EmptyState message="No games have been scheduled yet." />;

  const GameCard = ({ game }) => {
    const home = getTeam(game.homeTeamId);
    const away = getTeam(game.awayTeamId);
    const dateStr = game.date ? new Date(game.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";
    const timeStr = game.time ? new Date("2000-01-01T" + game.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
    const isCompleted = game.status === "completed";

    // Detect yellow/red card stats
    const gameStats = game.playerStats || {};
    const statCategories = league.statCategories || [];
    const yellowKey = statCategories.find(s => s.label.toLowerCase().includes("yellow"))?.key;
    const redKey    = statCategories.find(s => s.label.toLowerCase().includes("red"))?.key;

    let totalYellow = 0, totalRed = 0;
    if (yellowKey || redKey) {
      Object.values(gameStats).forEach(stats => {
        if (yellowKey) totalYellow += Number(stats[yellowKey] || 0);
        if (redKey)    totalRed    += Number(stats[redKey]    || 0);
      });
    }

    return (
      <div
        className={`lp-game-card ${isCompleted ? "lp-game-completed" : ""} lp-game-card-clickable`}
        onClick={() => setSelectedGame({ game, home, away, dateStr, timeStr, totalYellow, totalRed, yellowKey, redKey, gameStats, statCategories })}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === "Enter" && setSelectedGame({ game, home, away, dateStr, timeStr, totalYellow, totalRed, yellowKey, redKey, gameStats, statCategories })}
      >
        <div className="lp-game-datetime">
          <span className="lp-game-date">{dateStr}</span>
          {timeStr && <span className="lp-game-time">{timeStr}</span>}
          {game.location && <span className="lp-game-loc">{game.location}</span>}
        </div>
        <div className="lp-game-matchup">
          <div className="lp-game-team lp-game-team-home">
            <span className="lp-game-teamname">{home?.name || "TBD"}</span>
          </div>
          {isCompleted
            ? <div className="lp-game-scorebox">
                <span className="lp-game-score-num">{game.homeScore}</span>
                <span className="lp-game-score-sep">–</span>
                <span className="lp-game-score-num">{game.awayScore}</span>
              </div>
            : <div className="lp-game-vs">vs</div>
          }
          <div className="lp-game-team lp-game-team-away">
            <span className="lp-game-teamname">{away?.name || "TBD"}</span>
          </div>
        </div>

        {/* Card chips row */}
        {isCompleted && (totalYellow > 0 || totalRed > 0) && (
          <div className="lp-game-cards-row">
            {totalYellow > 0 && (
              <span className="lp-card-chip lp-card-yellow">
                <span className="lp-card-rect" />
                {totalYellow}
              </span>
            )}
            {totalRed > 0 && (
              <span className="lp-card-chip lp-card-red">
                <span className="lp-card-rect" />
                {totalRed}
              </span>
            )}
          </div>
        )}

        {isCompleted && (() => {
          const hS = game.homeScore, aS = game.awayScore;
          const winner = hS > aS ? home : aS > hS ? away : null;
          return (
            <div className="lp-game-result">
              {winner
                ? <span className="lp-game-winner">{winner.name} won</span>
                : <span className="lp-game-draw">Draw</span>
              }
            </div>
          );
        })()}

        <span className="lp-game-view-details">View details</span>
      </div>
    );
  };

  return (
    <div className="lp-section lp-schedule">
      <div className="lp-search-wrap">
        <span className="lp-search-icon">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </span>
        <input
          className="lp-search-bar"
          placeholder="Search by team or location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className="lp-search-clear" onClick={() => setSearch("")}>&#x2715;</button>}
      </div>
      {search && upcoming.length === 0 && completed.length === 0 && (
        <p style={{ color: "var(--c-text3)", fontSize: "0.875rem" }}>No games match "{search}".</p>
      )}
      {upcoming.length > 0 && (
        <div className="lp-schedule-group">
          <p className="lp-schedule-label">Upcoming</p>
          <div className="lp-games-grid">
            {upcoming.map(g => <GameCard key={g.id} game={g} />)}
          </div>
        </div>
      )}
      {completed.length > 0 && (
        <div className="lp-schedule-group">
          <p className="lp-schedule-label">Results</p>
          <div className="lp-games-grid">
            {completed.map(g => <GameCard key={g.id} game={g} />)}
          </div>
        </div>
      )}

      {/* Game Modal */}
      {selectedGame && (
        <GameModal
          data={selectedGame}
          players={players}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   GAME MODAL
═══════════════════════════════════════ */
function GameModal({ data, players, onClose }) {
  const { game, home, away, dateStr, timeStr, yellowKey, redKey, gameStats, statCategories } = data;
  const isCompleted = game.status === "completed";

  const getPlayer = pid => players.find(p => p.id === pid);

  const hS = game.homeScore, aS = game.awayScore;
  const winner = isCompleted ? (hS > aS ? home : aS > hS ? away : null) : null;

  // Build per-player card events for display
  const cardEvents = [];
  if (isCompleted && (yellowKey || redKey)) {
    Object.entries(gameStats).forEach(([pid, stats]) => {
      const player = getPlayer(pid);
      if (!player) return;
      const yellows = Number(stats[yellowKey] || 0);
      const reds    = Number(stats[redKey]    || 0);
      for (let i = 0; i < yellows; i++) cardEvents.push({ player, type: "yellow" });
      for (let i = 0; i < reds;    i++) cardEvents.push({ player, type: "red" });
    });
  }

  // Close on backdrop click
  const handleBackdrop = e => { if (e.target === e.currentTarget) onClose(); };

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="lp-modal-backdrop" onClick={handleBackdrop}>
      <div className="lp-modal" role="dialog" aria-modal="true">

        {/* Close button */}
        <button className="lp-modal-close" onClick={onClose} aria-label="Close">&#x2715;</button>

        {/* Status label */}
        <p className="lp-modal-status">{isCompleted ? "Full Time" : "Upcoming"}</p>

        {/* Scoreline */}
        <div className="lp-modal-scoreline">
          <div className="lp-modal-team">
            <span className="lp-modal-team-name">{home?.name || "TBD"}</span>
          </div>

          <div className="lp-modal-score">
            {isCompleted
              ? <><span className={hS > aS ? "lp-modal-score-win" : ""}>{hS}</span>
                  <span className="lp-modal-score-sep">–</span>
                  <span className={aS > hS ? "lp-modal-score-win" : ""}>{aS}</span></>
              : <span className="lp-modal-score-vs">vs</span>
            }
          </div>

          <div className="lp-modal-team lp-modal-team-right">
            <span className="lp-modal-team-name">{away?.name || "TBD"}</span>
          </div>
        </div>

        {/* Result line */}
        {isCompleted && (
          <p className="lp-modal-result">
            {winner ? <><strong>{winner.name}</strong> won</> : "Draw"}
          </p>
        )}

        <div className="lp-modal-divider" />

        {/* Meta info */}
        <div className="lp-modal-meta">
          {dateStr && (
            <div className="lp-modal-meta-row">
              <span className="lp-modal-meta-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 5.5h12M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              </span>
              <span>{dateStr}{timeStr && ` · ${timeStr}`}</span>
            </div>
          )}
          {game.location && (
            <div className="lp-modal-meta-row">
              <span className="lp-modal-meta-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5C4.79 1.5 3 3.29 3 5.5c0 3 4 7 4 7s4-4 4-7c0-2.21-1.79-3.5-4-3.5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="7" cy="5.5" r="1.2" stroke="currentColor" strokeWidth="1.2"/></svg>
              </span>
              <span>{game.location}</span>
            </div>
          )}
        </div>

        {/* Card events */}
        {cardEvents.length > 0 && (
          <>
            <div className="lp-modal-divider" />
            <p className="lp-modal-section-label">Cards</p>
            <div className="lp-modal-cards-list">
              {cardEvents.map((ev, i) => (
                <div key={i} className="lp-modal-card-row">
                  <span className={`lp-card-chip lp-card-${ev.type}`}>
                    <span className="lp-card-rect" />
                  </span>
                  <span className="lp-modal-card-player">
                    {ev.player.firstName} {ev.player.lastName}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Game notes */}
        {game.gameNotes && (
          <>
            <div className="lp-modal-divider" />
            <p className="lp-modal-section-label">Match Notes</p>
            <p className="lp-modal-notes">{game.gameNotes}</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   LEADERBOARD TAB
═══════════════════════════════════════ */
function LeaderboardTab({ players, teams, games, league }) {
  const statCategories = league.statCategories || [];
  const [activeStat, setActiveStat] = useState(statCategories[0]?.key || "");

  if (statCategories.length === 0) return <EmptyState message="No stat categories have been set up for this league yet." />;
  if (players.length === 0) return <EmptyState message="No players have been added yet." />;

  const statTotals = {};
  games.filter(g => g.status === "completed" && g.playerStats).forEach(game => {
    Object.entries(game.playerStats).forEach(([pid, stats]) => {
      if (!statTotals[pid]) statTotals[pid] = {};
      Object.entries(stats).forEach(([k, v]) => {
        statTotals[pid][k] = (statTotals[pid][k] || 0) + (Number(v) || 0);
      });
    });
  });

  const getTeam = tid => teams.find(t => t.id === tid);

  const ranked = players
    .map(p => ({ ...p, total: statTotals[p.id]?.[activeStat] || 0 }))
    .sort((a, b) => b.total - a.total)
    .filter(p => p.total > 0);

  return (
    <div className="lp-section">
      <div className="lp-stat-tabs">
        {statCategories.map(s => (
          <button
            key={s.key}
            className={`lp-stat-tab ${activeStat === s.key ? "active" : ""}`}
            onClick={() => setActiveStat(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {ranked.length === 0 ? (
        <EmptyState message={`No ${statCategories.find(s => s.key === activeStat)?.label || "stats"} recorded yet.`} />
      ) : (
        <div className="lp-leaderboard">
          {ranked.map((player, i) => {
            const team = getTeam(player.teamId);
            return (
              <div key={player.id} className="lp-lb-row">
                <div className="lp-lb-rank">
                  <span className="lp-lb-rank-num">{i + 1}</span>
                </div>
                <div className="lp-lb-avatar">
                  {player.photoUrl
                    ? <img src={player.photoUrl} alt={player.firstName} />
                    : <span>{player.firstName[0]}{player.lastName[0]}</span>
                  }
                </div>
                <div className="lp-lb-info">
                  <p className="lp-lb-name">{player.firstName} {player.lastName}</p>
                  {team && (
                    <p className="lp-lb-team">
                      {team.name}
                    </p>
                  )}
                </div>
                {player.position && <span className="lp-lb-pos">{player.position}</span>}
                <div className="lp-lb-value">
                  <span className="lp-lb-num">{player.total}</span>
                  <span className="lp-lb-label">{statCategories.find(s => s.key === activeStat)?.label}</span>
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
function PlayersTab({ players, teams, games, league }) {
  const [filter, setFilter]     = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch]     = useState("");

  const getTeam = tid => teams.find(t => t.id === tid);

  const statTotals = {};
  games.filter(g => g.status === "completed" && g.playerStats).forEach(game => {
    Object.entries(game.playerStats).forEach(([pid, stats]) => {
      if (!statTotals[pid]) statTotals[pid] = {};
      Object.entries(stats).forEach(([k, v]) => {
        statTotals[pid][k] = (statTotals[pid][k] || 0) + (Number(v) || 0);
      });
    });
  });

  const statCategories = league.statCategories || [];

  const filtered = (filter === "all" ? players : players.filter(p => p.teamId === filter))
    .filter(p => {
      const q = search.toLowerCase();
      return !q || `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
        || (p.position || "").toLowerCase().includes(q)
        || (p.jerseyNumber || "").includes(q)
        || (getTeam(p.teamId)?.name || "").toLowerCase().includes(q);
    });

  if (players.length === 0) return <EmptyState message="No players have been added yet." />;

  return (
    <div className="lp-section">
      {teams.length > 1 && (
        <div className="lp-filter-row">
          <button
            className={`lp-filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Teams
          </button>
          {teams.map(t => (
            <button
              key={t.id}
              className={`lp-filter-btn ${filter === t.id ? "active" : ""}`}
              onClick={() => setFilter(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="lp-search-wrap">
        <span className="lp-search-icon">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </span>
        <input
          className="lp-search-bar"
          placeholder="Search players by name, team, or position..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className="lp-search-clear" onClick={() => setSearch("")}>&#x2715;</button>}
      </div>

      <div className="lp-players-grid">
        {filtered.length === 0 && search && (
          <p style={{ color: "var(--c-text3)", fontSize: "0.875rem", gridColumn: "1/-1" }}>No players match "{search}".</p>
        )}
        {filtered.map(player => {
          const team   = getTeam(player.teamId);
          const isOpen = expanded === player.id;
          const stats  = statTotals[player.id] || {};
          const hasStats = statCategories.some(s => (stats[s.key] || 0) > 0);
          const notes  = player.notes || [];

          return (
            <div key={player.id} className={`lp-player-card ${isOpen ? "open" : ""}`}>
              <div className="lp-player-card-top" onClick={() => setExpanded(isOpen ? null : player.id)}>
                <div className="lp-player-avatar">
                  {player.photoUrl
                    ? <img src={player.photoUrl} alt={player.firstName} />
                    : <span>{player.firstName[0]}{player.lastName[0]}</span>
                  }
                </div>
                <div className="lp-player-info">
                  <p className="lp-player-name">{player.firstName} {player.lastName}</p>
                  <div className="lp-player-meta-row">
                    {team && (
                      <span className="lp-player-team">
                        {team.name}
                      </span>
                    )}
                    {player.position  && <span className="lp-player-pos">{player.position}</span>}
                    {player.jerseyNumber && <span className="lp-player-jersey">#{player.jerseyNumber}</span>}
                  </div>
                </div>
                <button className="lp-expand-btn" aria-label={isOpen ? "Collapse" : "Expand"}>
                  {isOpen ? "▲" : "▼"}
                </button>
              </div>

              {isOpen && (
                <div className="lp-player-detail">
                  {player.bio && <p className="lp-player-bio">{player.bio}</p>}

                  {hasStats && (
                    <div className="lp-player-stats">
                      <p className="lp-player-stats-title">Season Stats</p>
                      <div className="lp-player-stats-grid">
                        {statCategories.map(s => (
                          <div key={s.key} className="lp-player-stat-item">
                            <span className="lp-player-stat-val">{stats[s.key] || 0}</span>
                            <span className="lp-player-stat-label">{s.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {notes.length > 0 && (
                    <div className="lp-player-notes">
                      <p className="lp-player-stats-title">Notes</p>
                      <ul className="lp-notes-list">
                        {notes.map((note, i) => (
                          <li key={i} className="lp-note-item">
                            <span className="lp-note-bullet" />
                            <span className="lp-note-text">{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!player.bio && !hasStats && notes.length === 0 && (
                    <p className="lp-player-no-data">No additional info available.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="lp-empty">
      <p className="lp-empty-msg">{message}</p>
    </div>
  );
}
