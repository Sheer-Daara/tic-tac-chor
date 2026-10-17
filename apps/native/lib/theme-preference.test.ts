import { describe, expect, it, vi } from "vite-plus/test";

import { applyNativeThemePreference } from "./theme-preference";

describe("native appearance preferences", () => {
  it.each(["light", "dark"] as const)("disables adaptive themes before applying %s", (theme) => {
    const calls: string[] = [];
    const runtime = {
      setAdaptiveThemes: (enabled: boolean) => calls.push(`adaptive:${enabled}`),
      setTheme: (scheme: string) => calls.push(`theme:${scheme}`),
    };
    const appearance = { setColorScheme: (scheme: string) => calls.push(`native:${scheme}`) };
    applyNativeThemePreference(theme, runtime, appearance);
    expect(calls).toEqual(["adaptive:false", `native:${theme}`, `theme:${theme}`]);
  });

  it("restores live system appearance after an explicit override without forcing a stale theme", () => {
    const runtime = { setAdaptiveThemes: vi.fn(), setTheme: vi.fn() };
    const appearance = { setColorScheme: vi.fn() };
    applyNativeThemePreference("dark", runtime, appearance);
    runtime.setTheme.mockClear();
    applyNativeThemePreference("system", runtime, appearance);
    expect(appearance.setColorScheme).toHaveBeenLastCalledWith("unspecified");
    expect(runtime.setAdaptiveThemes).toHaveBeenLastCalledWith(true);
    expect(runtime.setTheme).not.toHaveBeenCalled();
  });
});
