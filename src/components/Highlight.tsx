import { Fragment } from "react";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Wraps case-insensitive matches of the query words in <mark>. */
export function Highlight({ text, query }: { text: string; query?: string }) {
  const words = (query ?? "")
    .replace(/["']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^(or|and|-.*)$/i.test(w));
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map(escape).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? <mark key={i}>{part}</mark> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}
