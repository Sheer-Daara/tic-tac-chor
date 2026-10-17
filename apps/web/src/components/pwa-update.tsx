import { Button } from "@tic-tac-chor/ui/components/button";
import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { useGame } from "@/components/game-provider";
import { reloadAfterLatestSave, requestPwaReload } from "@/lib/pwa-update";

export function PwaUpdate() {
  const { controller, snapshot } = useGame();
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const reloadAllowed = useRef(false);
  const workerActivated = useRef(false);
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, value) {
      registration.current = value;
    },
    onNeedReload() {
      // Another open tab may activate an update. This tab still needs its own user consent.
      workerActivated.current = true;
      if (reloadAllowed.current) void finishReload();
      else setNeedRefresh(true);
    },
  });

  async function finishReload() {
    const result = await reloadAfterLatestSave(controller, () => window.location.reload());
    if (result !== "requested") {
      reloadAllowed.current = false;
      setNeedRefresh(true);
      setIsReloading(false);
      setError(
        result === "save-failed"
          ? "Your latest changes could not be saved. Retry saving before reloading."
          : "The update could not be applied. Keep playing and try again later.",
      );
    }
  }

  useEffect(() => {
    function checkForUpdate() {
      if (navigator.onLine) void registration.current?.update().catch(() => {});
    }
    window.addEventListener("focus", checkForUpdate);
    window.addEventListener("online", checkForUpdate);
    return () => {
      window.removeEventListener("focus", checkForUpdate);
      window.removeEventListener("online", checkForUpdate);
    };
  }, []);

  async function reload() {
    if (isReloading) return;
    setIsReloading(true);
    setError(null);
    const result = await requestPwaReload(controller, async () => {
      reloadAllowed.current = true;
      if (workerActivated.current) await finishReload();
      else await updateServiceWorker(true);
    });
    if (result !== "requested") {
      reloadAllowed.current = false;
      setError(
        result === "save-failed"
          ? "Your latest changes could not be saved. Retry saving before reloading."
          : "The update could not be applied. Keep playing and try again later.",
      );
      setIsReloading(false);
    }
  }

  if (!offlineReady && !needRefresh) return null;

  return (
    <section className="pwa-notice" aria-label="App update" aria-live="polite">
      <div>
        <p>
          {needRefresh
            ? "A fresh version is ready. Reload when you’re ready; a new round will start."
            : "Ready to play offline. Your scores stay on this device."}
        </p>
        {error !== null ? <p role="alert">{error}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {needRefresh ? (
          <Button
            disabled={isReloading || snapshot.status !== "ready"}
            onClick={() => void reload()}
          >
            {isReloading ? "Updating…" : "Reload"}
          </Button>
        ) : null}
        <Button
          variant="outline"
          disabled={isReloading}
          onClick={() => {
            setOfflineReady(false);
            setNeedRefresh(false);
            setError(null);
          }}
        >
          {needRefresh ? "Not now" : "Got it"}
        </Button>
      </div>
    </section>
  );
}
