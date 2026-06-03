import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import "./AdminDashboard.css";

const SPORT_ABBR = {
  Soccer: "SOC", Basketball: "BSK", Baseball: "BSB", Football: "FTB",
  Volleyball: "VBL", Custom: "LGE"
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeagues();
  }, [user]);

  const fetchLeagues = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "leagues"), where("adminId", "==", user.uid));
      const snap = await getDocs(q);
      setLeagues(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (leagueId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this league? This cannot be undone.")) return;
    await deleteDoc(doc(db, "leagues", leagueId));
    setLeagues(prev => prev.filter(l => l.id !== leagueId));
  };

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="container dashboard-container page-enter">

        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">My Leagues</h1>
            <p className="dashboard-sub">
              Welcome back, {user?.displayName || user?.email?.split("@")[0]}
            </p>
          </div>
          <Link to="/admin/leagues/new" className="btn btn-primary">
            + New League
          </Link>
        </div>

        {loading ? (
          <div className="dashboard-loading">
            <div className="spinner" />
          </div>
        ) : leagues.length === 0 ? (
          <div className="dashboard-empty card">
            <p className="empty-label">No leagues yet</p>
            <p>Create your first league and get started in minutes.</p>
            <Link to="/admin/leagues/new" className="btn btn-primary" style={{ marginTop: 16 }}>
              + Create League
            </Link>
          </div>
        ) : (
          <div className="leagues-grid">
            {leagues.map(league => (
              <Link
                key={league.id}
                to={`/admin/leagues/${league.id}`}
                className="league-card card"
                style={{ "--league-color": league.color || "#f0c040" }}
              >
                <div className="league-card-top">
                  <div className="league-card-logo">
                    {league.logoUrl
                      ? <img src={league.logoUrl} alt={league.name} />
                      : <span className="league-logo-abbr">{SPORT_ABBR[league.sport] || "LGE"}</span>
                    }
                  </div>
                  <div className="league-card-actions">
                    <button
                      className="btn btn-ghost icon-btn"
                      title="Delete league"
                      onClick={(e) => handleDelete(league.id, e)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="league-card-body">
                  <h3 className="league-card-name">{league.name}</h3>
                  <p className="league-card-location">
                    {league.city && `${league.city}, `}{league.state}
                  </p>
                </div>

                <div className="league-card-footer">
                  <span className="badge badge-sport">
                    {league.sport}
                  </span>
                  <span className="league-card-arrow">Manage →</span>
                </div>
              </Link>
            ))}

            {/* Add new card */}
            <Link to="/admin/leagues/new" className="league-card league-card-new card">
              <span className="new-league-plus">+</span>
              <span className="new-league-text">New League</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}