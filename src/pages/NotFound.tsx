import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";

export default function NotFound({ title = "Page not found", message = "The page you're looking for doesn't exist." }: { title?: string; message?: string }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Seo title={title} />
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted-foreground">{message}</p>
      <Button asChild className="mt-6"><Link to="/">Back to latest news</Link></Button>
    </div>
  );
}
