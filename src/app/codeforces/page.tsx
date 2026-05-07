"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface ContestData {
  id: number; name: string; startTime: number; durationSeconds: number; type: string;
  solvedInContest: number; solvedUpsolving: number; totalSubmissions: number;
  problems: Array<{ id: number; problemIndex: string; name: string }>;
  participants: Array<{ name: string }>;
}

export default function CodeforcesPage() {
  const [contests, setContests] = useState<ContestData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contests")
      .then((r) => r.json())
      .then(setContests)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header">
        <h1>🏆 Codeforces — Contests</h1>
        <p>{contests.length} contests registrados</p>
      </div>

      {contests.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <h3>No hay contests todavía</h3>
          <p>Sincronizá los datos desde <a href="/settings">Configuración</a></p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {contests.map((contest) => (
            <Link key={contest.id} href={`/codeforces/${contest.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="contest-card">
                <div className="contest-info">
                  <div className="contest-name">{contest.name}</div>
                  <div className="contest-date">
                    {new Date(contest.startTime * 1000).toLocaleDateString("es-AR", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                    {" · "}
                    {Math.round(contest.durationSeconds / 3600)}h
                    {contest.participants.length > 0 && (
                      <> · {contest.participants.map((p) => p.name).join(", ")}</>
                    )}
                  </div>
                </div>
                <div className="contest-stats">
                  <div className="contest-stat">
                    <div className="contest-stat-value" style={{ color: "var(--accent-green)" }}>{contest.solvedInContest}</div>
                    <div className="contest-stat-label">In contest</div>
                  </div>
                  <div className="contest-stat">
                    <div className="contest-stat-value" style={{ color: "var(--accent-blue)" }}>{contest.solvedUpsolving}</div>
                    <div className="contest-stat-label">Upsolved</div>
                  </div>
                  <div className="contest-stat">
                    <div className="contest-stat-value">{contest.problems.length}</div>
                    <div className="contest-stat-label">Problemas</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
