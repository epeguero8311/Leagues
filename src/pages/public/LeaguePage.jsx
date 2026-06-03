import { useState, useEffect } from "react";
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

      {/* League header */}
      <div className="lp-header" style={{ borderTop: `4px solid ${accentColor}` }}>
        <div className="container">

          {/* Top row — logo, name, stats, expand toggle */}
          <div className="lp-header-top">
            <div className="lp-logo" style={{ background: accentColor + "18", border: `2px solid ${accentColor}33` }}>
              {league.logoUrl
                ? <img src={league.logoUrl} alt={league.name} />
                : <span style={{ color: accentColor, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em" }}>
                    {SPORT_ABBR[league.sport] || "LGE"}
                  </span>
              }
            </div>

            <div className="lp-header-info">
              <div className="lp-sport-badge" style={{ color: accentColor, background: accentColor + "14", border: `1px solid ${accentColor}30` }}>
                {league.sport}
              </div>
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
                  style={{ color: accentColor, borderColor: accentColor + "44" }}
                >
                  {descOpen ? "Hide info ▲" : "About this league ▼"}
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
                style={tab === t ? { color: accentColor, borderBottomColor: accentColor } : {}}
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
        {tab === "Standings"   && <StandingsTab   teams={teams} games={games} accentColor={accentColor} />}
        {tab === "Schedule"    && <ScheduleTab     teams={teams} games={games} />}
        {tab === "Leaderboard" && <LeaderboardTab  players={players} teams={teams} games={games} league={league} accentColor={accentColor} />}
        {tab === "Players"     && <PlayersTab      players={players} teams={teams} games={games} league={league} accentColor={accentColor} />}
      </div>

      <footer className="lp-footer">
        <div className="container lp-footer-inner">
          <Link to="/" className="lp-footer-brand">LeagueHub</Link>
          <span className="lp-footer-copy">Public league page · No account needed</span>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════
   STANDINGS TAB
═══════════════════════════════════════ */
function StandingsTab({ teams, games, accentColor }) {
  const completed = games.filter(g => g.status === "completed");

  // Build standings
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
                  <span className="lp-rank-num" style={i === 0 && team.played > 0 ? { background: accentColor, color: "#fff" } : {}}>
                    {i + 1}
                  </span>
                </td>
                <td>
                  <div className="lp-team-cell">
                    <span className="lp-team-dot" style={{ background: team.color }} />
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
function ScheduleTab({ teams, games }) {
  const getTeam = tid => teams.find(t => t.id === tid);
  const upcoming  = games.filter(g => g.status !== "completed");
  const completed = games.filter(g => g.status === "completed").reverse();

  if (games.length === 0) return <EmptyState message="No games have been scheduled yet." />;

  const GameCard = ({ game }) => {
    const home = getTeam(game.homeTeamId);
    const away = getTeam(game.awayTeamId);
    const dateStr = game.date ? new Date(game.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";
    const timeStr = game.time ? new Date("2000-01-01T" + game.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";

    return (
      <div className={`lp-game-card ${game.status === "completed" ? "lp-game-completed" : ""}`}>
        <div className="lp-game-datetime">
          <span className="lp-game-date">{dateStr}</span>
          {timeStr && <span className="lp-game-time">{timeStr}</span>}
          {game.location && <span className="lp-game-loc">{game.location}</span>}
        </div>
        <div className="lp-game-matchup">
          <div className="lp-game-team lp-game-team-home">
            <span className="lp-game-dot" style={{ background: home?.color }} />
            <span className="lp-game-teamname">{home?.name || "TBD"}</span>
          </div>
          {game.status === "completed"
            ? <div className="lp-game-scorebox">
                <span className="lp-game-score-num">{game.homeScore}</span>
                <span className="lp-game-score-sep">–</span>
                <span className="lp-game-score-num">{game.awayScore}</span>
              </div>
            : <div className="lp-game-vs">vs</div>
          }
          <div className="lp-game-team lp-game-team-away">
            <span className="lp-game-teamname">{away?.name || "TBD"}</span>
            <span className="lp-game-dot" style={{ background: away?.color }} />
          </div>
        </div>
        {game.status === "completed" && (() => {
          const hS = game.homeScore, aS = game.awayScore;
          const winner = hS > aS ? home : aS > hS ? away : null;
          return winner
            ? <div className="lp-game-result">
                <span className="lp-game-winner">{winner.name} won</span>
              </div>
            : <div className="lp-game-result"><span className="lp-game-draw">Draw</span></div>;
        })()}
      </div>
    );
  };

  return (
    <div className="lp-section lp-schedule">
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
    </div>
  );
}

/* ═══════════════════════════════════════
   LEADERBOARD TAB
═══════════════════════════════════════ */
function LeaderboardTab({ players, teams, games, league, accentColor }) {
  const statCategories = league.statCategories || [];
  const [activeStat, setActiveStat] = useState(statCategories[0]?.key || "");

  if (statCategories.length === 0) return <EmptyState message="No stat categories have been set up for this league yet." />;
  if (players.length === 0) return <EmptyState message="No players have been added yet." />;

  // Aggregate stats from all completed games
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
      {/* Stat selector */}
      <div className="lp-stat-tabs">
        {statCategories.map(s => (
          <button
            key={s.key}
            className={`lp-stat-tab ${activeStat === s.key ? "active" : ""}`}
            style={activeStat === s.key ? { background: accentColor, borderColor: accentColor, color: "#fff" } : {}}
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
              <div key={player.id} className={`lp-lb-row ${i < 3 ? "lp-lb-top" : ""}`}>
                <div className="lp-lb-rank">
                  {i === 0
                    ? <span className="lp-lb-medal gold">1</span>
                    : i === 1
                    ? <span className="lp-lb-medal silver">2</span>
                    : i === 2
                    ? <span className="lp-lb-medal bronze">3</span>
                    : <span className="lp-lb-rank-num">{i + 1}</span>
                  }
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
                      <span className="lp-lb-team-dot" style={{ background: team.color }} />
                      {team.name}
                    </p>
                  )}
                </div>
                {player.position && <span className="lp-lb-pos">{player.position}</span>}
                <div className="lp-lb-value" style={{ color: accentColor }}>
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
function PlayersTab({ players, teams, games, league, accentColor }) {
  const [filter, setFilter]     = useState("all");
  const [expanded, setExpanded] = useState(null);

  const getTeam   = tid => teams.find(t => t.id === tid);
  const filtered  = filter === "all" ? players : players.filter(p => p.teamId === filter);

  if (players.length === 0) return <EmptyState message="No players have been added yet." />;

  // Aggregate stats per player
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

  return (
    <div className="lp-section">
      {/* Team filter */}
      {teams.length > 1 && (
        <div className="lp-filter-row">
          <button className={`lp-filter-btn ${filter === "all" ? "active" : ""}`} style={filter === "all" ? { background: accentColor, borderColor: accentColor, color: "#fff" } : {}} onClick={() => setFilter("all")}>
            All Teams
          </button>
          {teams.map(t => (
            <button
              key={t.id}
              className={`lp-filter-btn ${filter === t.id ? "active" : ""}`}
              style={filter === t.id ? { background: t.color, borderColor: t.color, color: "#fff" } : {}}
              onClick={() => setFilter(t.id)}
            >
              <span className="lp-filter-dot" style={{ background: filter === t.id ? "#fff" : t.color }} />
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="lp-players-grid">
        {filtered.map(player => {
          const team    = getTeam(player.teamId);
          const isOpen  = expanded === player.id;
          const stats   = statTotals[player.id] || {};
          const hasStats = statCategories.some(s => stats[s.key] > 0);

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
                      <span className="lp-player-team" style={{ color: team.color }}>
                        <span className="lp-team-dot-sm" style={{ background: team.color }} />
                        {team.name}
                      </span>
                    )}
                    {player.position && <span className="lp-player-pos">{player.position}</span>}
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
                        {statCategories.filter(s => stats[s.key] > 0).map(s => (
                          <div key={s.key} className="lp-player-stat-item">
                            <span className="lp-player-stat-val" style={{ color: accentColor }}>{stats[s.key]}</span>
                            <span className="lp-player-stat-label">{s.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!player.bio && !hasStats && (
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