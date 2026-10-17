import { describe, expect, it, vi } from "vite-plus/test";

import { applyTheme, createSystemThemeStore, resolveTheme } from "./theme";

describe("browser appearance binding", () => {
  it("resolves System live while retaining explicit Light/Dark overrides", () => {
    expect(resolveTheme("system", "light")).toBe("light");
    expect(resolveTheme("system", "dark")).toBe("dark");
    expect(resolveTheme("light", "light")).toBe("light");
    expect(resolveTheme("light", "dark")).toBe("light");
    expect(resolveTheme("dark", "light")).toBe("dark");
    expect(resolveTheme("dark", "dark")).toBe("dark");
  });

  it("uses one deferred media query and removes the identical change listener", () => {
    const query = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const getMedia = vi.fn(() => query);
    const store = createSystemThemeStore(getMedia);
    const onChange = vi.fn();

    expect(getMedia).not.toHaveBeenCalled();
    expect(store.getServerSnapshot()).toBe("light");
    expect(getMedia).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe("light");
    const cleanup = store.subscribe(onChange);
    expect(query.addEventListener).toHaveBeenCalledWith("change", onChange);

    query.matches = true;
    query.addEventListener.mock.calls[0]![1]();
    expect(onChange).toHaveBeenCalledOnce();
    expect(store.getSnapshot()).toBe("dark");
    expect(getMedia).toHaveBeenCalledOnce();

    cleanup();
    expect(query.removeEventListener).toHaveBeenCalledWith("change", onChange);
  });

  it("updates the theme class and browser controls without removing other classes", () => {
    const classes = new Set(["existing-app-class"]);
    const root = {
      classList: {
        toggle(token: string, force?: boolean) {
          if (force) classes.add(token);
          else classes.delete(token);
          return classes.has(token);
        },
      },
      style: { colorScheme: "" },
    };

    applyTheme(root, "dark");
    expect(classes).toEqual(new Set(["existing-app-class", "dark"]));
    expect(root.style.colorScheme).toBe("dark");
    applyTheme(root, "light");
    expect(classes).toEqual(new Set(["existing-app-class"]));
    expect(root.style.colorScheme).toBe("light");
  });
});
