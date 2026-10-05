/**
 * Renders a schema.org JSON-LD block. Search engines read these to build rich
 * results (FAQ accordions, how-to steps, breadcrumbs).
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Serialised once at build time; content is fully static.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}