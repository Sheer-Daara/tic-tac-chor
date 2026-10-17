import { createInitialSnapshot, serializeSnapshot } from "@tic-tac-chor/game";
import type { PersistedSnapshot } from "@tic-tac-chor/game";
import { describe, expect, it, vi } from "vite-plus/test";
import {
  createNativePersistenceAdapter,
  NATIVE_SNAPSHOT_DIRECTORY,
  NATIVE_SNAPSHOT_FILE,
  type NativeSnapshotFileIO,
} from "./persistence";

const device = vi.hoisted(() => ({
  enabled: false,
  files: new Map<string, string>(),
  directoryOptions: null as unknown,
  relocationOptions: [] as unknown[],
}));

vi.mock("expo-file-system", () => ({
  Directory: class {
    uri: string;
    constructor(parent: string, name: string) {
      if (!device.enabled) throw new Error("File system unavailable");
      this.uri = `${parent}${name}/`;
    }
    create(options: unknown) {
      device.directoryOptions = options;
    }
  },
  File: class {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    info() {
      return { exists: device.files.has(this.uri) };
    }
    text() {
      return Promise.resolve(device.files.get(this.uri));
    }
    write(content: string) {
      device.files.set(this.uri, content);
    }
    async copy(to: { uri: string }, options: unknown) {
      device.relocationOptions.push(options);
      device.files.set(to.uri, device.files.get(this.uri)!);
    }
    async move(to: { uri: string }, options: unknown) {
      device.relocationOptions.push(options);
      device.files.set(to.uri, device.files.get(this.uri)!);
      device.files.delete(this.uri);
    }
  },
  Paths: { document: "file:///private/documents/" },
}));

const backupFile = `${NATIVE_SNAPSHOT_FILE}.backup`;
const tempFile = `${NATIVE_SNAPSHOT_FILE}.tmp`;
const initial = createInitialSnapshot();
const changed: PersistedSnapshot = {
  ...initial,
  stats: { wins: 2, losses: 3, draws: 4 },
  theme: "dark",
  lastBackgroundIndex: 2,
};

function setup(saved: Record<string, string> = {}) {
  const files = new Map(Object.entries(saved));
  const fileIO: NativeSnapshotFileIO = {
    ensureDirectory: vi.fn(),
    read: vi.fn(async (name) => files.get(name) ?? null),
    write: vi.fn((name, content) => {
      files.set(name, content);
    }),
    copy: vi.fn(async (from, to) => {
      const content = files.get(from);
      if (content === undefined) throw new Error("Missing copy source");
      files.set(to, content);
    }),
    move: vi.fn(async (from, to) => {
      const content = files.get(from);
      if (content === undefined) throw new Error("Missing move source");
      files.set(to, content);
      files.delete(from);
    }),
  };
  return { files, fileIO, adapter: createNativePersistenceAdapter({ fileIO }) };
}

describe("native private-file persistence", () => {
  it("wires modern Expo APIs to the private documents directory with safe overwrite", async () => {
    device.enabled = true;
    device.files.clear();
    device.relocationOptions = [];
    try {
      const adapter = createNativePersistenceAdapter();
      expect(await adapter.load()).toBeNull();
      await adapter.save(initial);
      await adapter.save(changed);
      expect(await adapter.load()).toEqual(changed);
      const directory = `file:///private/documents/${NATIVE_SNAPSHOT_DIRECTORY}/`;
      expect(device.files.get(`${directory}${NATIVE_SNAPSHOT_FILE}`)).toBe(
        serializeSnapshot(changed),
      );
      expect(device.files.get(`${directory}${backupFile}`)).toBe(serializeSnapshot(initial));
      expect(device.directoryOptions).toEqual({ intermediates: true, idempotent: true });
      expect(device.relocationOptions).toEqual([
        { overwrite: true },
        { overwrite: true },
        { overwrite: true },
      ]);
    } finally {
      device.enabled = false;
    }
  });

  it("round-trips only the versioned preferences and aggregate results", async () => {
    const { adapter, files, fileIO } = setup();
    expect(await adapter.load()).toBeNull();
    await adapter.save(changed);
    expect(await adapter.load()).toEqual(changed);
    expect(files.get(NATIVE_SNAPSHOT_FILE)).toBe(serializeSnapshot(changed));
    expect(files.has(tempFile)).toBe(false);
    expect(fileIO.ensureDirectory).toHaveBeenCalledOnce();
  });

  it.each(["{broken", JSON.stringify({ ...initial, version: 3 })])(
    "falls back to defaults when primary and recovery data are unusable: %s",
    async (invalid) => {
      const { adapter } = setup({ [NATIVE_SNAPSHOT_FILE]: invalid, [backupFile]: invalid });
      expect(await adapter.load()).toBeNull();
    },
  );

  it.each([undefined, "{broken", JSON.stringify({ ...initial, stats: { wins: -1 } })])(
    "recovers the last good snapshot when primary is missing or invalid: %s",
    async (invalid) => {
      const saved = { [backupFile]: serializeSnapshot(initial) };
      if (invalid !== undefined) Object.assign(saved, { [NATIVE_SNAPSHOT_FILE]: invalid });
      expect(await setup(saved).adapter.load()).toEqual(initial);
    },
  );

  it("prefers a valid primary over the older recovery copy", async () => {
    const { adapter, fileIO } = setup({
      [NATIVE_SNAPSHOT_FILE]: serializeSnapshot(changed),
      [backupFile]: serializeSnapshot(initial),
    });
    expect(await adapter.load()).toEqual(changed);
    expect(fileIO.read).toHaveBeenCalledTimes(1);
  });

  it("keeps a known good recovery copy before replacing the primary", async () => {
    const { adapter, files } = setup({ [NATIVE_SNAPSHOT_FILE]: serializeSnapshot(initial) });
    await adapter.save(changed);
    expect(files.get(backupFile)).toBe(serializeSnapshot(initial));
    expect(await adapter.load()).toEqual(changed);
    files.set(NATIVE_SNAPSHOT_FILE, "incomplete replacement");
    expect(await adapter.load()).toEqual(initial);
  });

  it("never replaces a good recovery copy with malformed primary data", async () => {
    const { adapter, files, fileIO } = setup({
      [NATIVE_SNAPSHOT_FILE]: "corrupt",
      [backupFile]: serializeSnapshot(initial),
    });
    await adapter.save(changed);
    expect(fileIO.copy).not.toHaveBeenCalled();
    expect(files.get(backupFile)).toBe(serializeSnapshot(initial));
    expect(await adapter.load()).toEqual(changed);
  });

  it("surfaces read errors instead of treating denied access as a fresh installation", async () => {
    const { adapter, fileIO } = setup();
    const error = new Error("Permission denied");
    vi.mocked(fileIO.read).mockRejectedValueOnce(error);
    await expect(adapter.load()).rejects.toBe(error);
  });

  it("surfaces directory creation errors without touching saved data", async () => {
    const { adapter, fileIO, files } = setup({
      [NATIVE_SNAPSHOT_FILE]: serializeSnapshot(initial),
    });
    const error = new Error("Directory creation failed");
    vi.mocked(fileIO.ensureDirectory).mockRejectedValueOnce(error);
    await expect(adapter.save(changed)).rejects.toBe(error);
    expect(fileIO.write).not.toHaveBeenCalled();
    expect(files.get(NATIVE_SNAPSHOT_FILE)).toBe(serializeSnapshot(initial));
  });

  it("preserves the primary if a staged write fails, then permits a retry", async () => {
    const { adapter, fileIO, files } = setup({
      [NATIVE_SNAPSHOT_FILE]: serializeSnapshot(initial),
    });
    const error = new Error("Disk full");
    vi.mocked(fileIO.write).mockImplementationOnce((name) => {
      files.set(name, "partial");
      throw error;
    });
    await expect(adapter.save(changed)).rejects.toBe(error);
    expect(await adapter.load()).toEqual(initial);
    await adapter.save(changed);
    expect(await adapter.load()).toEqual(changed);
  });

  it("preserves the primary if backing it up fails", async () => {
    const { adapter, fileIO } = setup({ [NATIVE_SNAPSHOT_FILE]: serializeSnapshot(initial) });
    const error = new Error("Copy failed");
    vi.mocked(fileIO.copy).mockRejectedValueOnce(error);
    await expect(adapter.save(changed)).rejects.toBe(error);
    expect(fileIO.move).not.toHaveBeenCalled();
    expect(await adapter.load()).toEqual(initial);
  });

  it("recovers even when a failed move corrupts the destination", async () => {
    const { adapter, fileIO, files } = setup({
      [NATIVE_SNAPSHOT_FILE]: serializeSnapshot(initial),
    });
    const error = new Error("Replacement failed");
    vi.mocked(fileIO.move).mockImplementationOnce(async (_, to) => {
      files.set(to, "partial replacement");
      throw error;
    });
    await expect(adapter.save(changed)).rejects.toBe(error);
    expect(await adapter.load()).toEqual(initial);
    await adapter.save(changed);
    expect(await adapter.load()).toEqual(changed);
  });

  it("rejects invalid snapshots before any file operation", async () => {
    const { adapter, fileIO } = setup();
    await expect(
      adapter.save({ ...initial, theme: "bad" } as unknown as PersistedSnapshot),
    ).rejects.toThrow("Invalid persisted game snapshot");
    expect(fileIO.ensureDirectory).not.toHaveBeenCalled();
    expect(fileIO.write).not.toHaveBeenCalled();
  });

  it("defers unsupported-device errors until load or save", async () => {
    const adapter = createNativePersistenceAdapter();
    await expect(adapter.load()).rejects.toThrow("File system unavailable");
    await expect(adapter.save(initial)).rejects.toThrow("File system unavailable");
  });
});
