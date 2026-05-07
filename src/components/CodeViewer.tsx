"use client";

import { Highlight, themes } from "prism-react-renderer";

interface CodeViewerProps {
  code: string;
  language?: string;
  header?: string;
}

function mapLanguage(lang?: string): string {
  if (!lang) return "cpp";
  const l = lang.toLowerCase();
  if (l.includes("c++") || l.includes("gnu c")) return "cpp";
  if (l.includes("python")) return "python";
  if (l.includes("java") && !l.includes("javascript")) return "java";
  if (l.includes("javascript") || l.includes("node")) return "javascript";
  if (l.includes("kotlin")) return "kotlin";
  if (l.includes("rust")) return "rust";
  if (l.includes("go")) return "go";
  return "cpp";
}

export function CodeViewer({ code, language, header }: CodeViewerProps) {
  const lang = mapLanguage(language);

  return (
    <div className="code-container">
      {header && <div className="code-header"><span>{header}</span><span>{language}</span></div>}
      <div className="code-body">
        <Highlight theme={themes.nightOwl} code={code} language={lang}>
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre style={{ ...style, background: "transparent", margin: 0 }}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  <span style={{ display: "inline-block", width: "3em", textAlign: "right", paddingRight: "1em", color: "#555570", userSelect: "none" }}>
                    {i + 1}
                  </span>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
