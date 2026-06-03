import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-logo">
          <span className="logo-text">League<span>Hub</span></span>
        </Link>
        <div className="navbar-actions">
          {user ? (
            <>
              <Link to="/admin/dashboard" className="btn btn-ghost">Dashboard</Link>
              <button onClick={handleLogout} className="btn btn-secondary">Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/admin/login" className="btn btn-ghost">Sign In</Link>
              <Link to="/admin/login" className="btn btn-primary">Admin Portal</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}