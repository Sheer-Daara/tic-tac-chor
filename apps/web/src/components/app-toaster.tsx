import { Toaster } from "@tic-tac-chor/ui/components/sonner";

import { useTheme } from "./theme-provider";

export function AppToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme} richColors />;
}
