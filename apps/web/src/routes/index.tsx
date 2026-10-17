import { createFileRoute } from "@tanstack/react-router";
import { GameScreen } from "@/components/game-screen";

export const Route = createFileRoute("/")({ component: GameScreen });
