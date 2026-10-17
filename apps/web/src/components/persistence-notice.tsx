import { Button } from "@tic-tac-chor/ui/components/button";

import { useGame } from "./game-provider";

export function PersistenceNotice() {
  const { controller, snapshot } = useGame();
  if (snapshot.persistenceError === null) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2">
      <p role="status" className="text-sm text-muted-foreground">
        Local data could not be loaded or saved. You can keep playing; changes may be lost.
      </p>
      <Button variant="outline" className="min-h-11" onClick={controller.retrySave}>
        Retry save
      </Button>
    </div>
  );
}
