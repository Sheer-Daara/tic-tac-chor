import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@tic-tac-chor/ui/components/alert-dialog";
import { Button } from "@tic-tac-chor/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@tic-tac-chor/ui/components/dialog";
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@tic-tac-chor/ui/components/field";
import { ToggleGroup, ToggleGroupItem } from "@tic-tac-chor/ui/components/toggle-group";
import { Toggle } from "@tic-tac-chor/ui/components/toggle";
import { Monitor, Moon, Settings2, Sun, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";

import { useGame } from "./game-provider";
import { PersistenceNotice } from "./persistence-notice";
import { useTheme } from "./theme-provider";

const choices = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

export function Settings() {
  const { controller, snapshot } = useGame();
  const { theme, setTheme, isReady } = useTheme();
  const [resetOpen, setResetOpen] = useState(false);
  const { wins, losses, draws } = snapshot.persisted.stats;
  const soundEnabled = snapshot.persisted.soundEnabled;
  const canReset = isReady && wins + losses + draws > 0;

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Settings" />}>
        <Settings2 aria-hidden="true" />
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="settings-panel overflow-y-auto overscroll-contain rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle>Make it yours</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <FieldSet disabled={!isReady}>
            <FieldLegend>Appearance</FieldLegend>
            <FieldDescription id="theme-help">
              System follows your device. Light and Dark stay as you choose.
            </FieldDescription>
            <ToggleGroup
              aria-label="Appearance"
              aria-describedby="theme-help"
              variant="outline"
              value={[theme]}
              onValueChange={(values) => {
                const value = values[0];
                if (value === "system" || value === "light" || value === "dark") setTheme(value);
              }}
              className="max-w-full flex-wrap"
            >
              {choices.map(({ value, label, icon: Icon }) => (
                <ToggleGroupItem key={value} value={value} disabled={!isReady}>
                  <Icon aria-hidden="true" data-icon="inline-start" />
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </FieldSet>
          <FieldSet disabled={!isReady}>
            <FieldLegend>Sound</FieldLegend>
            <FieldDescription id="sound-help">
              Distinct cues play for your moves and Mudi's. Turn them off any time.
            </FieldDescription>
            <Toggle
              aria-label="Move sound"
              aria-describedby="sound-help"
              variant="outline"
              pressed={soundEnabled}
              disabled={!isReady}
              onPressedChange={(pressed: boolean) => controller.setSoundEnabled(pressed)}
              className="w-fit"
            >
              {soundEnabled ? (
                <Volume2 aria-hidden="true" data-icon="inline-start" />
              ) : (
                <VolumeX aria-hidden="true" data-icon="inline-start" />
              )}
              {soundEnabled ? "Sound on" : "Sound off"}
            </Toggle>
          </FieldSet>
          <FieldSet>
            <FieldLegend>Your scorecard</FieldLegend>
            <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
              <AlertDialogTrigger disabled={!canReset} render={<Button variant="outline" />}>
                Reset statistics
              </AlertDialogTrigger>
              <AlertDialogContent className="settings-panel max-w-[calc(100%-2rem)] overflow-y-auto overscroll-contain rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset your scorecard?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Clear all wins, losses and draws on this browser? Your current round, theme and
                    background will stay the same.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my scores</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={!isReady}
                    onClick={() => {
                      controller.resetStats();
                      setResetOpen(false);
                    }}
                  >
                    Reset scores
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </FieldSet>
          <FieldDescription>
            Your results stay in this browser. Reloading starts a fresh round. Add the app to your
            home screen from your browser’s menu.
          </FieldDescription>
        </FieldGroup>
        <PersistenceNotice />
        <DialogFooter>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
