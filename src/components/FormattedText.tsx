import React from "react";

interface FormattedTextProps {
  text: string;
}

// Lightweight Markdown-ish renderer: handles bold (**text**), italic (*text*),
// bold-italic (***text***), inline code (`code`), links [text](url),
// paragraphs (double newline) and single-line breaks.
export function FormattedText({ text }: FormattedTextProps) {
  if (!text) return null;

  const renderInline = (chunk: string, baseKey: string) => {
    const nodes: React.ReactNode[] = [];
    const regex = /(\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let i = 0;

    while ((match = regex.exec(chunk)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(chunk.slice(lastIndex, match.index));
      }

      if (match[2]) {
        nodes.push(
          <strong key={`${baseKey}-bemi-${i}`} className="font-black italic text-slate-900">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        nodes.push(
          <strong key={`${baseKey}-b-${i}`} className="font-black text-slate-900">
            {match[3]}
          </strong>
        );
      } else if (match[4]) {
        nodes.push(
          <em key={`${baseKey}-i-${i}`} className="italic text-slate-800">
            {match[4]}
          </em>
        );
      } else if (match[5]) {
        nodes.push(
          <code key={`${baseKey}-code-${i}`} className="bg-slate-100 px-1 rounded text-slate-800">
            {match[5]}
          </code>
        );
      } else if (match[6] && match[7]) {
        const label = match[6];
        const href = match[7];
        nodes.push(
          <a key={`${baseKey}-a-${i}`} href={href} className="text-sky-600 underline" target="_blank" rel="noreferrer">
            {label}
          </a>
        );
      }

      lastIndex = regex.lastIndex;
      i += 1;
    }

    if (lastIndex < chunk.length) nodes.push(chunk.slice(lastIndex));
    return nodes;
  };

  // Split by double newlines into paragraphs; single newline -> <br />
  const paragraphs = text.split(/\n{2,}/g);

  return (
    <>
      {paragraphs.map((para, pIdx) => {
        const inlineNodes = renderInline(para, `p${pIdx}`);
        // replace single newlines inside paragraph with <br />
        const withBreaks: React.ReactNode[] = [];
        inlineNodes.forEach((node, idx) => {
          if (typeof node === "string") {
            const parts = (node as string).split(/\n/g);
            parts.forEach((part, pi) => {
              if (pi > 0) withBreaks.push(<br key={`br-${pIdx}-${idx}-${pi}`} />);
              if (part !== "") withBreaks.push(part);
            });
          } else {
            withBreaks.push(node);
          }
        });

        return (
          <p key={`para-${pIdx}`} className="mb-2 leading-relaxed text-slate-800">
            {withBreaks}
          </p>
        );
      })}
    </>
  );
}
