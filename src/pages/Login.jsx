import { useState } from "react";
import { http } from "../api/http";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await http.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      nav("/users");
    } catch (err) {
      setMsg(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Please enter your details to sign in."
    >
      {msg && (
        <div className="alert alert-danger py-2 text-center border-0 shadow-sm">
          {msg}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className="mb-3">
          <label className="form-label small text-muted fw-bold text-uppercase">Email Address</label>
          <input
            className="form-control form-control-lg bg-light border-light"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label className="form-label small text-muted fw-bold text-uppercase">Password</label>
          <input
            className="form-control form-control-lg bg-light border-light"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button 
          className="btn btn-primary btn-lg w-100 fw-bold shadow-sm"
          disabled={loading}
        >
          {loading ? (
             <span><span className="spinner-border spinner-border-sm me-2"/>Signing in...</span>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <div className="mt-4 text-center">
        <span className="text-muted small">Don't have an account? </span>
        <Link 
          to="/register" 
          className="text-decoration-none fw-bold ms-1"
          style={{ color: "var(--bs-primary)" }}
        >
          Create account
        </Link>
      </div>
    </AuthLayout>
  );
}