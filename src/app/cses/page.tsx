"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface CsesProblem {
  id: number; csesId: string; name: string; category: string; url: string;
  totalSubmissions: number; solvedBy: string[]; isSolved: boolean;
}

export default function CsesPage() {
  const [data, setData] = useState<Record<string, CsesProblem[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "solved" | "unsolved">("all");

  useEffect(() => {
    fetch("/api/cses/problems")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const categories = Object.keys(data);
  const totalProblems = Object.values(data).flat().length;
  const solvedProblems = Object.values(data).flat().filter((p) => p.isSolved).length;

  if (totalProblems === 0) {
    return (
      <>
        <div className="page-header"><h1>📘 CSES Problem Set</h1></div>
        <div className="empty-state">
          <div className="icon">📭</div>
          <h3>No hay problemas todavía</h3>
          <p>Sincronizá los datos desde <a href="/settings">Configuración</a></p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>📘 CSES Problem Set</h1>
        <p>{solvedProblems}/{totalProblems} problemas resueltos</p>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>Todos</button>
        <button className={`tab ${filter === "solved" ? "active" : ""}`} onClick={() => setFilter("solved")}>Resueltos</button>
        <button className={`tab ${filter === "unsolved" ? "active" : ""}`} onClick={() => setFilter("unsolved")}>Sin resolver</button>
      </div>

      {categories.map((category) => {
        const problems = data[category].filter((p) =>
          filter === "all" ? true : filter === "solved" ? p.isSolved : !p.isSolved
        );
        if (problems.length === 0) return null;
        const solved = data[category].filter((p) => p.isSolved).length;

        return (
          <div key={category} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
              {category}
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--accent-green)" }}>{solved}/{data[category].length}</span>
            </h2>
            <div className="table-container">
              <table>
                <thead><tr><th>Problema</th><th>Estado</th><th>Resuelto por</th><th>Submissions</th><th>Link</th></tr></thead>
                <tbody>
                  {problems.map((p) => (
                    <tr key={p.id} className="clickable" onClick={() => window.location.href = `/cses/${p.csesId}`}>
                      <td><Link href={`/cses/${p.csesId}`} style={{ color: "var(--text-primary)", fontWeight: 500 }}>{p.name}</Link></td>
                      <td>{p.isSolved ? <span className="status-icon status-solved">✅</span> : <span className="status-icon status-unsolved">—</span>}</td>
                      <td>{p.solvedBy.length > 0 ? p.solvedBy.join(", ") : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                      <td>{p.totalSubmissions}</td>
                      <td><a href={p.url} target="_blank" rel="noreferrer" className="link-external" onClick={(e) => e.stopPropagation()}>CSES ↗</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}
