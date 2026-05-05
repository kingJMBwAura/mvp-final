import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import KronosHeader from "../components/KronosHeader";
import { useAuth } from "../services/auth";
import "../styles/SellPage.css";
import "../styles/AuthPage.css";

const emptyForm = {
  username: "",
  email: "",
  password: "",
  first_name: "",
  last_name: "",
};

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const isSignup = mode === "signup";

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const authAction = isSignup ? signup : login;
      const user = await authAction(formData);
      navigate(user?.is_admin ? "/admin/listings" : "/shopnow");
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell auth-page">
      <KronosHeader />
      <main className="auth-layout">
        <section className="auth-copy">
          <p className="sell-eyebrow">Kronos Account</p>
          <h1 className="section-heading-serif">{isSignup ? "Start selling and shopping." : "Welcome back."}</h1>
          <p>
            Sign in to list watches for review, keep your seller profile attached, and access admin tools when your Django user is a superuser.
          </p>
        </section>

        <section className="auth-panel" aria-label={isSignup ? "Sign up" : "Log in"}>
          <div className="auth-tabs">
            <button type="button" className={!isSignup ? "auth-tab auth-tab--active" : "auth-tab"} onClick={() => setMode("login")}>
              Log In
            </button>
            <button type="button" className={isSignup ? "auth-tab auth-tab--active" : "auth-tab"} onClick={() => setMode("signup")}>
              Sign Up
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="sell-field">
              <span>Username</span>
              <input className="sell-input" name="username" value={formData.username} onChange={handleChange} required />
            </label>

            {isSignup && (
              <>
                <div className="auth-grid">
                  <label className="sell-field">
                    <span>First Name</span>
                    <input className="sell-input" name="first_name" value={formData.first_name} onChange={handleChange} required />
                  </label>
                  <label className="sell-field">
                    <span>Last Name</span>
                    <input className="sell-input" name="last_name" value={formData.last_name} onChange={handleChange} required />
                  </label>
                </div>
                <label className="sell-field">
                  <span>Email</span>
                  <input className="sell-input" type="email" name="email" value={formData.email} onChange={handleChange} required />
                </label>
              </>
            )}

            <label className="sell-field">
              <span>Password</span>
              <input className="sell-input" type="password" name="password" value={formData.password} onChange={handleChange} required />
            </label>

            <div className="auth-actions">
              <p>{error || (isSignup ? "Your listing submissions will be tied to this account." : "Use your Django superuser to open admin review.")}</p>
              <button className="sell-primary-btn" type="submit" disabled={submitting}>
                {submitting ? "Please wait..." : isSignup ? "Create Account" : "Log In"}
              </button>
            </div>
          </form>

          <Link className="auth-link" to="/sell">
            Continue to sell page
          </Link>
        </section>
      </main>
    </div>
  );
}
