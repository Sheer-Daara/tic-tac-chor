import { Link } from "@tanstack/react-router";
import { Settings } from "@/components/settings";
import { Mark } from "./marks";
import "./game-screen.css";

export default function Header() {
  return (
    <header className="game-header">
      <Link to="/" className="game-brand" aria-label="Tic-Tac-Chor home">
        <span className="game-brand__mark" aria-hidden="true">
          <Mark glyph="X" className="game-brand__x" />
          <Mark glyph="O" className="game-brand__o" />
        </span>
        <span className="game-brand__word">
          Tic-Tac-<strong>Chor</strong>
          <span className="game-brand__period">.</span>
        </span>
      </Link>
      <Settings />
    </header>
  );
}
