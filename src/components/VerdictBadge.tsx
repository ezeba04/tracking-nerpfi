export function VerdictBadge({ verdict }: { verdict: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    OK: { label: "AC", cls: "badge-accepted" },
    ACCEPTED: { label: "AC", cls: "badge-accepted" },
    WRONG_ANSWER: { label: "WA", cls: "badge-wrong" },
    TIME_LIMIT_EXCEEDED: { label: "TLE", cls: "badge-tle" },
    MEMORY_LIMIT_EXCEEDED: { label: "MLE", cls: "badge-mle" },
    RUNTIME_ERROR: { label: "RE", cls: "badge-re" },
    COMPILATION_ERROR: { label: "CE", cls: "badge-ce" },
    CHALLENGED: { label: "Hacked", cls: "badge-wrong" },
    IDLENESS_LIMIT_EXCEEDED: { label: "ILE", cls: "badge-tle" },
  };

  const v = verdict.toUpperCase();
  const info = map[v] || { label: verdict.replace(/_/g, " "), cls: "badge-other" };

  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}

export function ProblemStatus({ status }: { status: string }) {
  const icons: Record<string, { icon: string; cls: string; label: string }> = {
    solved_in_contest: { icon: "✅", cls: "status-solved", label: "Solved in contest" },
    upsolved: { icon: "🔄", cls: "status-upsolved", label: "Upsolved" },
    attempted: { icon: "⚠️", cls: "status-attempted", label: "Attempted" },
    unsolved: { icon: "—", cls: "status-unsolved", label: "Unsolved" },
  };

  const info = icons[status] || icons.unsolved;
  return <span className={`status-icon ${info.cls}`} title={info.label}>{info.icon}</span>;
}
