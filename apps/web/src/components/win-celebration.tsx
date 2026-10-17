import {
  defaultWinCelebrations,
  getWinCelebrationKind,
  selectWinCelebration,
  type GameOutcome,
  type WinCelebrationConfig,
} from "@tic-tac-chor/game";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import "./win-celebration.css";

export interface WinCelebrationProps {
  /** Terminal board outcome; renders nothing unless the computer won. */
  outcome: GameOutcome;
  /**
   * Zero-based per-kind count of computer wins before this one. Pass the
   * fair-win count for fair wins and the cheat-win count for cheat wins so
   * each list rotates independently round-robin.
   */
  occurrenceIndex: number;
  /** Full copy config; prefer this over the individual list props. */
  config?: WinCelebrationConfig;
  /** Replace to change the fair-win copy; add entries to rotate them. */
  fairTexts?: readonly string[];
  /** Replace to change the cheat-win copy; add entries to rotate them. */
  cheatTexts?: readonly string[];
}

/**
 * Fair computer wins get a playful bouncing banner; cheat wins get a large
 * full-board text reveal. Copy is fully configurable through props.
 */
export function WinCelebration({
  outcome,
  occurrenceIndex,
  config,
  fairTexts = config?.fairComputerWin ?? defaultWinCelebrations.fairComputerWin,
  cheatTexts = config?.cheatComputerWin ?? defaultWinCelebrations.cheatComputerWin,
  revealDelayMs = 1100,
}: WinCelebrationProps & { revealDelayMs?: number }) {
  const [dismissed, setDismissed] = useState(false);
  // Hold the celebration back briefly so the winning mark is visible first.
  const [revealed, setRevealed] = useState(false);
  const kind = getWinCelebrationKind(outcome);
  const text =
    kind === null
      ? ""
      : selectWinCelebration(
          { fairComputerWin: fairTexts, cheatComputerWin: cheatTexts },
          kind,
          occurrenceIndex,
        );
  const words = text.split(/\s+/).filter((word) => word.length > 0);

  // Belt-and-braces alongside the parent key={roundId}: re-arm if a new
  // outcome/text arrives on a reused instance.
  useEffect(() => {
    setDismissed(false);
    setRevealed(false);
    if (kind === null || text.length === 0) return;
    const timer = window.setTimeout(() => setRevealed(true), revealDelayMs);
    return () => window.clearTimeout(timer);
  }, [outcome, text, kind, revealDelayMs]);

  if (kind === null || dismissed || text.length === 0 || !revealed) return null;

  if (kind === "fair") {
    return (
      <div className="win-celebration win-celebration--fair">
        <div className="win-celebration__card" role="status" aria-live="polite" aria-atomic="true">
          <span className="win-celebration__text">{text}</span>
          <button
            className="win-celebration__dismiss"
            type="button"
            aria-label="Dismiss celebration"
            onClick={() => setDismissed(true)}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="win-celebration win-celebration--cheat">
      <div
        className="win-celebration__reveal"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={text}
      >
        <p className="win-celebration__kicker" aria-hidden="true">
          Masterstroke alert
        </p>
        <p className="win-celebration__title" aria-hidden="true">
          {words.map((word, index) => (
            <span
              key={`${word}-${index}`}
              className="win-celebration__word"
              style={{ animationDelay: `${150 + index * 140}ms` }}
            >
              {word}
            </span>
          ))}
        </p>
        <button
          className="win-celebration__dismiss win-celebration__dismiss--light"
          type="button"
          aria-label="Dismiss celebration"
          onClick={() => setDismissed(true)}
        >
          <X aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
