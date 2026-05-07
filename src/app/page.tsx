"use client";
import { useEffect, useState } from "react";
import { VerdictBadge } from "@/components/VerdictBadge";

interface DashboardData {
  team: { name: string; memberCount: number };
  codeforces: { contests: number; submissions: number; accepted: number; acceptRate: number };
  cses: { problemsAttempted: number; submissions: number; accepted: number; acceptRate: number };
  members: Array<{ name: string; codeforcesHandle: string; cfSubmissions: number; cfAccepted: number; csesSubmissions: number; csesAccepted: number }>;
  recentActivity: Array<{
    id: number; verdict: string; createdAt: number; language: string;
    member: { name: string }; problem: { name: string; problemIndex: string; contestId: number }; contest: { name: string };
  }>;
  recentSyncLogs: Array<{ id: number; status: string; message: string; startedAt: string }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><h3>Error al cargar datos</h3></div>;

  const hasData = data.codeforces.submissions > 0 || data.cses.submissions > 0;

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>{data.team.name} — {data.team.memberCount} miembros</p>
      </div>

      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-label">Contests CF</div>
          <div className="stat-value">{data.codeforces.contests}</div>
          <div className="stat-sub">{data.codeforces.submissions} submissions</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Accepted CF</div>
          <div className="stat-value" style={{ color: "var(--accent-green)" }}>{data.codeforces.accepted}</div>
          <div className="stat-sub">{data.codeforces.acceptRate}% acceptance rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Problemas CSES</div>
          <div className="stat-value">{data.cses.problemsAttempted}</div>
          <div className="stat-sub">{data.cses.submissions} submissions</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Accepted CSES</div>
          <div className="stat-value" style={{ color: "var(--accent-green)" }}>{data.cses.accepted}</div>
          <div className="stat-sub">{data.cses.acceptRate}% acceptance rate</div>
        </div>
      </div>

      {data.members.length > 0 && (
        <div className="card" style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>👥 Miembros del equipo</h2>
          <div className="table-container">
            <table>
              <thead><tr><th>Miembro</th><th>CF Subs</th><th>CF AC</th><th>CSES Subs</th><th>CSES AC</th></tr></thead>
              <tbody>
                {data.members.map((m) => (
                  <tr key={m.name}>
                    <td><div className="member-tag"><div className="member-avatar">{m.name[0]}</div>{m.name}</div></td>
                    <td>{m.cfSubmissions}</td>
                    <td style={{ color: "var(--accent-green)" }}>{m.cfAccepted}</td>
                    <td>{m.csesSubmissions}</td>
                    <td style={{ color: "var(--accent-green)" }}>{m.csesAccepted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasData && data.recentActivity.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📡 Actividad reciente</h2>
          <div className="table-container">
            <table>
              <thead><tr><th>Miembro</th><th>Problema</th><th>Verdict</th><th>Fecha</th></tr></thead>
              <tbody>
                {data.recentActivity.slice(0, 15).map((s) => (
                  <tr key={s.id}>
                    <td>{s.member.name}</td>
                    <td><a href={`/codeforces/${s.problem.contestId}/${s.problem.problemIndex}`}>{s.problem.problemIndex}. {s.problem.name}</a></td>
                    <td><VerdictBadge verdict={s.verdict} /></td>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{new Date(s.createdAt * 1000).toLocaleDateString("es-AR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasData && (
        <div className="empty-state">
          <div className="icon">🚀</div>
          <h3>¡Bienvenidos!</h3>
          <p>Andá a <a href="/settings">Configuración</a> para sincronizar tus datos de Codeforces y CSES.</p>
        </div>
      )}
    </>
  );
}
