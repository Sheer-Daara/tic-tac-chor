import { parseSnapshot, serializeSnapshot } from "@tic-tac-chor/game";
import type { PersistenceAdapter } from "@tic-tac-chor/game";
import { Directory, File, Paths } from "expo-file-system";

export const NATIVE_SNAPSHOT_DIRECTORY = "tic-tac-chor";
export const NATIVE_SNAPSHOT_FILE = "snapshot-v1.json";
const TEMP_FILE = `${NATIVE_SNAPSHOT_FILE}.tmp`;
const BACKUP_FILE = `${NATIVE_SNAPSHOT_FILE}.backup`;

/** Device operations are injectable so recovery is exercised without a native runtime. */
export interface NativeSnapshotFileIO {
  ensureDirectory(): void | Promise<void>;
  read(name: string): Promise<string | null>;
  write(name: string, content: string): void | Promise<void>;
  copy(from: string, to: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
}

function createDeviceFileIO(): NativeSnapshotFileIO {
  // Resolve the document path lazily: unsupported platforms fail through load/save,
  // where the controller can expose the error and continue with in-memory state.
  const directory = () => new Directory(Paths.document, NATIVE_SNAPSHOT_DIRECTORY);
  const file = (name: string) => new File(directory(), name);
  return {
    ensureDirectory() {
      directory().create({ intermediates: true, idempotent: true });
    },
    async read(name) {
      const source = file(name);
      // info() validates read access; the exists getter silently returns false
      // for permission failures on Android and would erase that distinction.
      return source.info().exists ? source.text() : null;
    },
    write(name, content) {
      file(name).write(content);
    },
    async copy(from, to) {
      await file(from).copy(file(to), { overwrite: true });
    },
    async move(from, to) {
      await file(from).move(file(to), { overwrite: true });
    },
  };
}

export function createNativePersistenceAdapter(
  options: { readonly fileIO?: NativeSnapshotFileIO } = {},
): PersistenceAdapter {
  const fileIO = options.fileIO ?? createDeviceFileIO();
  return {
    async load() {
      const primary = parseSnapshot(await fileIO.read(NATIVE_SNAPSHOT_FILE));
      if (primary !== null) return primary;
      return parseSnapshot(await fileIO.read(BACKUP_FILE));
    },
    async save(snapshot) {
      const json = serializeSnapshot(snapshot);
      await fileIO.ensureDirectory();
      // Stage the complete JSON before touching the last known good snapshot.
      await fileIO.write(TEMP_FILE, json);
      const primary = parseSnapshot(await fileIO.read(NATIVE_SNAPSHOT_FILE));
      if (primary !== null) await fileIO.copy(NATIVE_SNAPSHOT_FILE, BACKUP_FILE);
      // Keep one recovery copy because Expo does not promise atomic replacement.
      await fileIO.move(TEMP_FILE, NATIVE_SNAPSHOT_FILE);
    },
  };
}
