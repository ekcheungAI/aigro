import { useParams } from "react-router-dom";
import Reveal from "@/components/Reveal";

interface PlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
}

/** Route stub — page agents replace these with full implementations. */
export default function Placeholder({ eyebrow, title, description }: PlaceholderProps) {
  const params = useParams();
  return (
    <section className="mx-auto max-w-container px-6 py-24 max-md:py-16">
      <Reveal>
        <p className="text-overline font-sans uppercase text-text-muted">{eyebrow}</p>
        <h1 className="mt-2 font-display text-display text-text-primary">{title}</h1>
        <p className="mt-4 max-w-[640px] text-body-lg text-text-secondary">
          {description}
        </p>
        {params.slug && (
          <p className="mt-4 font-mono text-caption text-text-muted">
            slug: {params.slug}
          </p>
        )}
      </Reveal>
    </section>
  );
}
