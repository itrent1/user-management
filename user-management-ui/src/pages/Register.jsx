import { useState } from "react";
import { http } from "../api/http";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false); 
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setIsError(false);
    setLoading(true);

    try {
      const res = await http.post("/auth/register", { name, email, password });
      const link = res.data.confirmLink;

      setMsg(
        <>
          Registration successful!
          <div className="mt-2">
            Confirm your email:
            <div>
              <a href={link} target="_blank" rel="noreferrer">
                {link}
              </a>
            </div>
          </div>
        </>
      );
    } catch (err) {
      setIsError(true);
      setMsg(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join us to manage users effectively."
    >
      {msg && (
        <div className={`alert ${isError ? "alert-danger" : "alert-success"} py-2 text-center border-0 shadow-sm`}>
          {msg}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className="mb-3">
          <label className="form-label small text-muted fw-bold text-uppercase">Full Name</label>
          <input
            className="form-control form-control-lg bg-light border-light"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label small text-muted fw-bold text-uppercase">Email Address</label>
          <input
            className="form-control form-control-lg bg-light border-light"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
            <span><span className="spinner-border spinner-border-sm me-2"/>Processing...</span>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <div className="mt-4 text-center">
        <span className="text-muted small">Already have an account? </span>
        <Link 
          to="/login" 
          className="text-decoration-none fw-bold ms-1"
          style={{ color: "var(--bs-primary)" }}
        >
          Sign in
        </Link>
      </div>
    </AuthLayout>
  );
}