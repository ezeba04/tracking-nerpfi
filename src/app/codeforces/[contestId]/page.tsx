"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { VerdictBadge, ProblemStatus } from "@/components/VerdictBadge";

interface ProblemData {
  id: number; contestId: number; problemIndex: string; name: string; rating: number | null;
  tags: string[]; url: string; status: string; submissionCount: number; membersSolved: string[];
}

interface ContestDetail {
  contest: { id: number; name: string; startTime: number; durationSeconds: number };
  problems: ProblemData[];
}

export default function ContestDetailPage() {
  const { contestId } = useParams<{ contestId: string }>();
  const [data, setData] = useState<ContestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/contests/${contestId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [contestId]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><h3>Contest no encontrado</h3></div>;

  return (
    <>
      <div className="breadcrumb">
        <Link href="/codeforces">Codeforces</Link> <span>›</span> <span>{data.contest.name}</span>
      </div>
      <div className="page-header">
        <h1>{data.contest.name}</h1>
        <p>
          {new Date(data.contest.startTime * 1000).toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          {" · "}{Math.round(data.contest.durationSeconds / 3600)}h de duración
        </p>
      </div>

      <div className="card-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Resueltos en contest</div>
          <div className="stat-value" style={{ color: "var(--accent-green)" }}>
            {data.problems.filter((p) => p.status === "solved_in_contest").length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Upsolved</div>
          <div className="stat-value" style={{ color: "var(--accent-blue)" }}>
            {data.problems.filter((p) => p.status === "upsolved").length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total problemas</div>
          <div className="stat-value">{data.problems.length}</div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr><th style={{width: 40}}>#</th><th>Problema</th><th>Rating</th><th>Estado</th><th>Resuelto por</th><th>Subs</th><th>Link</th></tr>
          </thead>
          <tbody>
            {data.problems.map((problem) => (
              <tr key={problem.id} className="clickable" onClick={() => window.location.href = `/codeforces/${contestId}/${problem.problemIndex}`}>
                <td style={{ fontWeight: 700, color: "var(--accent-blue)" }}>{problem.problemIndex}</td>
                <td>
                  <Link href={`/codeforces/${contestId}/${problem.problemIndex}`} style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    {problem.name}
                  </Link>
                  {problem.tags.length > 0 && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{problem.tags.join(", ")}</div>
                  )}
                </td>
                <td>{problem.rating || "—"}</td>
                <td><ProblemStatus status={problem.status} /></td>
                <td>
                  {problem.membersSolved.length > 0
                    ? problem.membersSolved.map((m) => (
                        <span key={m} className="member-tag" style={{ marginRight: 4 }}>
                          <span className="member-avatar">{m[0]}</span>{m}
                        </span>
                      ))
                    : <span style={{ color: "var(--text-muted)" }}>—</span>}
                </td>
                <td>{problem.submissionCount}</td>
                <td>
                  <a href={problem.url} target="_blank" rel="noreferrer" className="link-external" onClick={(e) => e.stopPropagation()}>
                    CF ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
