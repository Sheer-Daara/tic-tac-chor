export type MarkGlyph = "X" | "O";

/**
 * The game's marks are drawn, not typed: a bowed marker cross and a ring whose
 * return stroke overshoots. The same shapes appear in the logo, so the brand and
 * the board speak one visual language. Color comes from `currentColor`.
 */
export function Mark({
  glyph,
  className,
  dataActor,
}: {
  glyph: MarkGlyph;
  className?: string;
  dataActor?: "player" | "computer";
}) {
  return (
    <svg
      className={className}
      data-actor={dataActor}
      viewBox="0 0 100 100"
      focusable="false"
      aria-hidden="true"
    >
      {glyph === "X" ? (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M25 21C37 38 61 62 76 80" />
          <path d="M78 21C63 39 39 62 23 81" />
        </g>
      ) : (
        <path
          d="M50 21C65 21 79 33 79 50C79 67 66 80 49 80C32 80 20 67 20 50C20 33 33 21 50 21C58 21 65 23 71 27"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
