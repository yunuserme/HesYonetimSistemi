import { useState } from "react";
import { LockKeyhole, LogIn, Zap } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getDefaultPathForRole, useAuth } from "../context/AuthContext.jsx";

const INVALID_CREDENTIALS_MESSAGE = "Invalid username or password.";

export default function Login() {
  const { isAuthenticated, isAuthenticating, signIn, user } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated && user) {
    return <Navigate to={getDefaultPathForRole(user.role)} replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

 async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      // Sadece signIn işleminin bitmesini bekle.
      // Başarılı olursa AuthContext state'i güncelleyecek ve 
      // en üstteki <Navigate /> bloğu otomatik çalışacak.
      await signIn(formData); 
      
    } catch (loginError) {
      setError(
        loginError.status === 401
          ? INVALID_CREDENTIALS_MESSAGE
          : loginError.message || "Login failed.",
      );
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-600 p-2 text-white">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">HES Yonetim Sistemi</p>
            <p className="text-xs text-slate-500">Hydroelectric Management Platform</p>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2 text-emerald-700">
            <LockKeyhole className="h-4 w-4" />
            <p className="text-sm font-semibold uppercase tracking-normal">Secure Login</p>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
            Sign in to continue
          </h1>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="text-sm font-semibold text-slate-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              required
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isAuthenticating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <LogIn className="h-4 w-4" />
            {isAuthenticating ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
