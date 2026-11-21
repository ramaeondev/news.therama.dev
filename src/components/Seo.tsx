import { Helmet } from "react-helmet-async";

const SITE = "therama AI News";
const ORIGIN = "https://news.therama.dev";

export function Seo({ title, description, path }: { title?: string; description?: string | null; path?: string }) {
  const full = title ? `${title} | ${SITE}` : `${SITE}: the latest AI news`;
  const desc = description || "The latest AI news from official AI company blogs and tech publications, with links to every original source.";
  return (
    <Helmet>
      <title>{full}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={title || SITE} />
      <meta property="og:description" content={desc} />
      {path !== undefined && <link rel="canonical" href={`${ORIGIN}${path}`} />}
      {path !== undefined && <meta property="og:url" content={`${ORIGIN}${path}`} />}
    </Helmet>
  );
}
