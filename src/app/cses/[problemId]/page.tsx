"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { VerdictBadge } from "@/components/VerdictBadge";
import { CodeViewer } from "@/components/CodeViewer";
import { CodeDiff } from "@/components/CodeDiff";

interface CsesSubmission {
  id: number; csesSubmissionId: string; verdict: string; timeMs: number | null;
  memoryKb: number | null; language: string | null; createdAt: string | null;
  sourceCode: string | null;
  member: { id: number; name: string; csesUsername: string };
}

interface CsesProblemDetail {
  problem: { id: number; csesId: string; name: string; category: string; url: string };
  submissions: CsesSubmission[];
}

export default function CsesProblemPage() {
  const { problemId } = useParams<{ problemId: string }>();
  const [data, setData] = useState<CsesProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<number | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => {
    fetch(`/api/cses/problems/${problemId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); if (d.submissions.length > 0) setSelectedSub(d.submissions[d.submissions.length - 1].id); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [problemId]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><h3>Problema no encontrado</h3></div>;

  const selected = data.submissions.find((s) => s.id === selectedSub);
  const selectedIdx = data.submissions.findIndex((s) => s.id === selectedSub);
  const prevSub = selectedIdx > 0 ? data.submissions[selectedIdx - 1] : null;

  return (
    <>
      <div className="breadcrumb">
        <Link href="/cses">CSES</Link> <span>›</span> <span>{data.problem.name}</span>
      </div>

      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1>{data.problem.name}</h1>
            <p>{data.problem.category} · {data.submissions.length} submissions</p>
          </div>
          <a href={data.problem.url} target="_blank" rel="noreferrer" className="link-external">Ver en CSES ↗</a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Submissions</h3>
          <div className="timeline">
            {data.submissions.map((sub) => {
              const isAC = sub.verdict.toUpperCase().includes("ACCEPTED") || sub.verdict === "OK";
              return (
                <div
                  key={sub.id}
                  className={`timeline-item ${isAC ? "accepted" : "wrong"}`}
                  style={{ cursor: "pointer", background: sub.id === selectedSub ? "var(--bg-tertiary)" : undefined, borderRadius: 8, padding: "12px 12px 12px 24px" }}
                  onClick={() => { setSelectedSub(sub.id); setShowDiff(false); }}
                >
                  <div className="timeline-meta">
                    <div className="timeline-time">{sub.createdAt || "—"}</div>
                  </div>
                  <div className="timeline-content">
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <VerdictBadge verdict={isAC ? "OK" : sub.verdict.toUpperCase().replace(/ /g, "_")} />
                      <span className="member-tag"><span className="member-avatar">{sub.member.name[0]}</span>{sub.member.name}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {sub.timeMs != null && <span>{sub.timeMs} ms · </span>}
                      {sub.memoryKb != null && <span>{sub.memoryKb} KB · </span>}
                      {sub.language && <span>{sub.language}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Código</h3>
            {selected && prevSub && prevSub.sourceCode && selected.sourceCode && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDiff(!showDiff)}>
                {showDiff ? "Ver código" : "Ver diff"}
              </button>
            )}
          </div>
          {selected?.sourceCode ? (
            showDiff && prevSub?.sourceCode ? (
              <CodeDiff oldCode={prevSub.sourceCode} newCode={selected.sourceCode} oldLabel={`#${prevSub.csesSubmissionId}`} newLabel={`#${selected.csesSubmissionId}`} />
            ) : (
              <CodeViewer code={selected.sourceCode} language={selected.language || undefined} header={`Submission #${selected.csesSubmissionId}`} />
            )
          ) : (
            <div className="empty-state" style={{ padding: 32 }}><p>Código no disponible</p></div>
          )}
        </div>
      </div>
    </>
  );
}
