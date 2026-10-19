import type { GameState } from "@tic-tac-chor/game";
import { useComputerMoveCard } from "@tic-tac-chor/game/react";
import { ArrowUpRight, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import "./move-card.css";

/** Long enough to read a short note, short enough to stay out of the way. */
const AUTO_HIDE_MS = 14_000;

/**
 * Floating, click-through note shown after each computer move. Only the link
 * and dismiss button capture pointer input, so the board stays playable even
 * while the card is on screen. It also pauses its timer while keyboard focus
 * is inside and clears itself when a new round starts.
 */
export function MoveCard({ game }: { readonly game: GameState | null }) {
  const { card, occurrence, dismiss } = useComputerMoveCard(game);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (card === null || held) return;
    const timer = window.setTimeout(dismiss, AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [card, occurrence, held, dismiss]);

  // A replacement card always restarts the countdown, even if the old link held focus.
  useEffect(() => {
    setHeld(false);
  }, [occurrence]);

  const announcement =
    card === null
      ? ""
      : `${card.title}${card.description === undefined ? "" : `. ${card.description}`}`;

  return (
    <div
      className="move-card-layer"
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false);
      }}
    >
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      {card === null ? null : (
        <aside key={occurrence} className="move-card" aria-label="Computer move note">
          <p className="move-card__eyebrow">
            <Sparkles aria-hidden="true" />
            Move note
          </p>
          <h2 className="move-card__title">{card.title}</h2>
          {card.description === undefined ? null : (
            <p className="move-card__description">{card.description}</p>
          )}
          {card.link === undefined ? null : (
            <a
              className="move-card__link"
              href={card.link}
              target="_blank"
              rel="noreferrer noopener"
            >
              Read more
              <ArrowUpRight aria-hidden="true" />
            </a>
          )}
          <button
            className="move-card__dismiss"
            type="button"
            aria-label="Dismiss move note"
            onClick={dismiss}
          >
            <X aria-hidden="true" />
          </button>
        </aside>
      )}
    </div>
  );
}
