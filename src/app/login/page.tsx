"use client";
import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location.href = "/";
    } else {
      setError("Contraseña incorrecta");
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-primary, #0a0a0f)",
    }}>
      <form onSubmit={handleSubmit} style={{
        background: "var(--bg-secondary, #12121a)",
        border: "1px solid var(--border, #1e1e2e)",
        borderRadius: 12,
        padding: 40,
        width: 360,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Cooperativa los Trapitos</h1>
          <p style={{ color: "var(--text-muted, #888)", fontSize: 14 }}>CP Tracker</p>
        </div>

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--border, #1e1e2e)",
            background: "var(--bg-primary, #0a0a0f)",
            color: "var(--text-primary, #eee)",
            fontSize: 15,
            outline: "none",
          }}
        />

        {error && (
          <p style={{ color: "var(--accent-red, #f44)", fontSize: 13, margin: 0 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--accent-blue, #3b82f6)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            opacity: loading || !password ? 0.6 : 1,
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
