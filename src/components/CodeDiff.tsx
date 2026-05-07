"use client";

import * as Diff from "diff";

interface CodeDiffProps {
  oldCode: string;
  newCode: string;
  oldLabel?: string;
  newLabel?: string;
}

export function CodeDiff({ oldCode, newCode, oldLabel, newLabel }: CodeDiffProps) {
  const changes = Diff.diffLines(oldCode, newCode);

  let lineNum = 0;

  return (
    <div className="diff-container">
      <div className="diff-header">
        {oldLabel && newLabel ? `${oldLabel} → ${newLabel}` : "Diff entre versiones"}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
        {changes.map((change, i) => {
          const lines = change.value.split("\n").filter((_, idx, arr) => idx < arr.length - 1 || _ !== "");

          return lines.map((line, j) => {
            if (!change.added && !change.removed) lineNum++;
            if (change.added) lineNum++;

            const cls = change.added ? "diff-added" : change.removed ? "diff-removed" : "diff-unchanged";
            const prefix = change.added ? "+" : change.removed ? "-" : " ";

            return (
              <div key={`${i}-${j}`} className={`diff-line ${cls}`}>
                <span className="diff-line-num">
                  {!change.removed ? lineNum : ""}
                </span>
                <span className="diff-line-content">
                  {prefix} {line}
                </span>
              </div>
            );
          });
        })}
      </div>
    </div>
  );
}
