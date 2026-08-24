import { useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import Navbar from "../components/Navbar";
import "./HomePage.css";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming"
];

const SPORT_ABBR = {
  Soccer:"SOC", Basketball:"BSK", Baseball:"BSB",
  Football:"FTB", Volleyball:"VBL", Custom:"LGE"
};

const FEATURES = [
  {
    title: "Live Standings",
    desc: "Team rankings update automatically every time a score is entered. Win-loss records and points always accurate.",
    icon: (
      <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    ),
  },
  {
    title: "Player Leaderboards",
    desc: "Top scorers, assists, and custom stat categories ranked in real time across the entire league.",
    icon: (
      <svg viewBox="0 0 24 24"><path d="M12 20v-6M6 20v-4M18 20v-2"/><rect x="2" y="3" width="20" height="14" rx="2"/></svg>
    ),
  },
  {
    title: "Schedule & Scores",
    desc: "Upcoming games with date, time, and location alongside a full archive of past results.",
    icon: (
      <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    ),
  },
  {
    title: "Player Profiles",
    desc: "Each player gets their own profile with photo, bio, position, jersey number, and full season stats.",
    icon: (
      <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    ),
  },
  {
    title: "Direct Share Links",
    desc: "Every league gets a unique URL. Share it with players and fans — no account needed to view anything.",
    icon: (
      <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
    ),
  },
  {
    title: "Any Sport",
    desc: "Built-in stat templates for soccer, basketball, baseball, and more — or create your own custom fields.",
    icon: (
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
    ),
  },
];

export default function HomePage() {
  const [selectedState, setSelectedState] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!selectedState && !searchTerm.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const constraints = [where("isPublic", "==", true)];
      if (selectedState) constraints.push(where("state", "==", selectedState));
      const snapshot = await getDocs(query(collection(db, "leagues"), ...constraints));
      let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        results = results.filter(l =>
          l.name?.toLowerCase().includes(term) ||
          l.city?.toLowerCase().includes(term) ||
          l.sport?.toLowerCase().includes(term)
        );
      }
      setLeagues(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home">
      <Navbar />

      {/* Hero */}
      <section className="hero">
        <div className="container hero-content page-enter">
          <span className="hero-eyebrow">Sports League Management</span>
          <h1 className="hero-title">
            Everything your league<br />
            <span>needs, in one place.</span>
          </h1>
          <p className="hero-sub">
            Standings, schedules, player stats, and leaderboards — all in one place.
            Players and fans can follow along without creating an account.
          </p>
          <div className="hero-ctas">
            <a href="#search" className="btn btn-lg btn-hero-primary">Find a League</a>
            <Link to="/admin/login" className="btn btn-lg btn-hero-secondary">Admin Portal</Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="container stats-bar-inner">
          <div className="stat-item">
            <span className="stat-value">100%</span>
            <span className="stat-label">Free to use</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">6+</span>
            <span className="stat-label">Sports supported</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">No app</span>
            <span className="stat-label">needed to view</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">Live</span>
            <span className="stat-label">score updates</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <section className="search-section" id="search">
        <div className="container">
          <div className="search-card card">
            <span className="section-tag">Find a League</span>
            <h2 className="search-title">Search for your league</h2>
            <p className="search-sub">Filter by state and name, or use the direct link your admin shared with you.</p>

            <div className="search-inputs">
              <div className="form-group">
                <label className="form-label">State</label>
                <select className="form-input" value={selectedState} onChange={e => setSelectedState(e.target.value)}>
                  <option value="">All States</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">League Name or Sport</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Houston Adult Soccer, Spring Basketball..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
              </div>
              <button className="btn btn-primary search-btn" onClick={handleSearch}>
                {loading ? <span className="spinner-sm" /> : "Search"}
              </button>
            </div>

            {searched && (
              <>
                <hr className="divider" />
                {loading ? (
                  <div className="results-loading"><div className="spinner" /></div>
                ) : leagues.length === 0 ? (
                  <div className="results-empty">
                    <p>No leagues found. Try a different search or ask your admin for the direct link.</p>
                  </div>
                ) : (
                  <div className="results-list">
                    <p className="results-count">{leagues.length} league{leagues.length !== 1 ? "s" : ""} found</p>
                    {leagues.map(league => (
                      <Link key={league.id} to={`/leagues/${league.id}`} className="league-result-card">
                        <div className="league-result-left">
                          <div className="league-result-logo">
                            {league.logoUrl
                              ? <img src={league.logoUrl} alt={league.name} />
                              : SPORT_ABBR[league.sport] || "LGE"
                            }
                          </div>
                          <div>
                            <p className="league-result-name">{league.name}</p>
                            <p className="league-result-meta">{league.city && `${league.city}, `}{league.state} &middot; {league.sport}</p>
                          </div>
                        </div>
                        <div className="league-result-right">
                          <span className="badge badge-sport">{league.sport}</span>
                          <span className="league-result-arrow">→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="container">
          <div className="features-header">
            <span className="section-tag">What's Included</span>
            <h2 className="features-title">Everything you need to run your league</h2>
            <p className="features-sub">Built for admins who want simplicity and fans who just want to follow the action.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon-wrap">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="admin-cta-section">
        <div className="container">
          <div className="admin-cta-card card">
            <div className="admin-cta-text">
              <h2>Ready to set up your league?</h2>
              <p>Create a free admin account and have your teams, schedule, and standings live in minutes.</p>
            </div>
            <Link to="/admin/login" className="btn btn-cta">Get Started Free</Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <span className="footer-logo">Tabla<span>fut</span></span>
          <p className="footer-copy">© 2026 Tablafut. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
