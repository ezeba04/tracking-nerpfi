"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { VerdictBadge } from "@/components/VerdictBadge";
import { CodeViewer } from "@/components/CodeViewer";
import { CodeDiff } from "@/components/CodeDiff";

interface Submission {
  id: number; verdict: string; timeMs: number | null; memoryBytes: number | null;
  language: string | null; createdAt: number; relativeTime: number | null;
  isDuringContest: boolean; sourceCode: string | null; passedTests: number | null;
  member: { id: number; name: string; codeforcesHandle: string };
}

interface ProblemDetail {
  problem: { id: number; contestId: number; problemIndex: string; name: string; rating: number | null; tags: string[]; url: string };
  contest: { id: number; name: string; startTime: number; durationSeconds: number };
  submissions: Submission[];
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProblemDetailPage() {
  const { contestId, problemIndex } = useParams<{ contestId: string; problemIndex: string }>();
  const [data, setData] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<number | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [memberFilter, setMemberFilter] = useState<string>("all");

  useEffect(() => {
    fetch(`/api/contests/${contestId}/problems/${problemIndex}`)
      .then((r) => r.json())
      .then((d) => { setData(d); if (d.submissions.length > 0) setSelectedSub(d.submissions[d.submissions.length - 1].id); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [contestId, problemIndex]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><h3>Problema no encontrado</h3></div>;

  const members = [...new Set(data.submissions.map((s) => s.member.name))];
  const filtered = memberFilter === "all" ? data.submissions : data.submissions.filter((s) => s.member.name === memberFilter);
  const selected = filtered.find((s) => s.id === selectedSub);
  const selectedIdx = filtered.findIndex((s) => s.id === selectedSub);
  const prevSub = selectedIdx > 0 ? filtered[selectedIdx - 1] : null;

  return (
    <>
      <div className="breadcrumb">
        <Link href="/codeforces">Codeforces</Link> <span>›</span>
        <Link href={`/codeforces/${contestId}`}>{data.contest.name}</Link> <span>›</span>
        <span>{data.problem.problemIndex}. {data.problem.name}</span>
      </div>

      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1>{data.problem.problemIndex}. {data.problem.name}</h1>
            <p>
              {data.problem.rating && <span>Rating: {data.problem.rating} · </span>}
              {data.problem.tags.length > 0 && <span>{data.problem.tags.join(", ")} · </span>}
              {filtered.length} submissions
            </p>
          </div>
          <a href={data.problem.url} target="_blank" rel="noreferrer" className="link-external">
            Ver en Codeforces ↗
          </a>
        </div>
      </div>

      {/* Member filter */}
      {members.length > 1 && (
        <div className="tabs">
          <button className={`tab ${memberFilter === "all" ? "active" : ""}`} onClick={() => setMemberFilter("all")}>Todos</button>
          {members.map((m) => (
            <button key={m} className={`tab ${memberFilter === m ? "active" : ""}`} onClick={() => setMemberFilter(m)}>{m}</button>
          ))}
        </div>
      )}

      {/* Submissions timeline */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Submissions</h3>
          <div className="timeline">
            {filtered.map((sub) => (
              <div
                key={sub.id}
                className={`timeline-item ${sub.verdict === "OK" ? "accepted" : "wrong"}`}
                style={{ cursor: "pointer", background: sub.id === selectedSub ? "var(--bg-tertiary)" : undefined, borderRadius: 8, padding: "12px 12px 12px 24px" }}
                onClick={() => { setSelectedSub(sub.id); setShowDiff(false); }}
              >
                <div className="timeline-meta">
                  <div className="timeline-time">{new Date(sub.createdAt * 1000).toLocaleString("es-AR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</div>
                  {sub.relativeTime != null && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {sub.isDuringContest ? `⏱️ ${formatTime(sub.relativeTime)}` : "📝 Upsolve"}
                    </div>
                  )}
                </div>
                <div className="timeline-content">
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <VerdictBadge verdict={sub.verdict} />
                    <span className="member-tag"><span className="member-avatar">{sub.member.name[0]}</span>{sub.member.name}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {sub.timeMs != null && <span>{sub.timeMs} ms · </span>}
                    {sub.memoryBytes != null && <span>{formatBytes(sub.memoryBytes)} · </span>}
                    {sub.language && <span>{sub.language} · </span>}
                    {sub.passedTests != null && sub.verdict !== "OK" && <span>Test #{sub.passedTests + 1} · </span>}
                    <a
                      href={`https://codeforces.com/${data.contest.id >= 100000 ? "gym" : "contest"}/${data.contest.id}/submission/${sub.id}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "var(--accent-blue)" }}
                    >CF ↗</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Code viewer */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Código</h3>
            {selected && prevSub && prevSub.sourceCode && selected.sourceCode && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDiff(!showDiff)}>
                {showDiff ? "Ver código" : "Ver diff vs anterior"}
              </button>
            )}
          </div>

          {selected?.sourceCode ? (
            showDiff && prevSub?.sourceCode ? (
              <CodeDiff
                oldCode={prevSub.sourceCode}
                newCode={selected.sourceCode}
                oldLabel={`#${prevSub.id}`}
                newLabel={`#${selected.id}`}
              />
            ) : (
              <CodeViewer
                code={selected.sourceCode}
                language={selected.language || undefined}
                header={`Submission #${selected.id}`}
              />
            )
          ) : selected ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <a
                href={`https://codeforces.com/${data.contest.id >= 100000 ? "gym" : "contest"}/${data.contest.id}/submission/${selected.id}`}
                target="_blank"
                rel="noreferrer"
                className="link-external"
                style={{ fontSize: 15 }}
              >
                Ver código en Codeforces ↗
              </a>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 32 }}>
              <p>Seleccioná una submission para ver el código.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
