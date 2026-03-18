'use client';

interface HighlightedTextProps {
  text: string;
  highlight: string;
}

export function HighlightedText({ text, highlight }: HighlightedTextProps) {
  const keyword = highlight.trim();

  if (!keyword) {
    return <>{text}</>;
  }

  const startIndex = text.indexOf(keyword);
  if (startIndex === -1) {
    return <>{text}</>;
  }

  const endIndex = startIndex + keyword.length;

  return (
    <>
      {text.slice(0, startIndex)}
      <mark className="rounded bg-amber-200/70 px-0.5 text-inherit">
        {text.slice(startIndex, endIndex)}
      </mark>
      {text.slice(endIndex)}
    </>
  );
}
