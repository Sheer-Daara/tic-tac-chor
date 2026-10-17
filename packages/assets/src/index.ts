/** Stable metadata can be shared without importing a platform asset loader. */
export interface AssetMetadata {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export interface BundledAsset<Source> {
  readonly metadata: AssetMetadata;
  readonly source: Source;
}

/** Background array order is the carousel order on both platforms. */
export interface AssetRegistry<Source> {
  readonly opponent: BundledAsset<Source>;
  readonly backgrounds: readonly BundledAsset<Source>[];
}

export const opponentMetadata: AssetMetadata = {
  id: "modi",
  label: "Nurundru Mudi",
  description: "An editorial caricature with a knowing smile; game dialogue is authored satire.",
};

/** Change this order to change the shared carousel sequence. */
export const backgroundMetadata = [
  { id: "knowing-smirk", label: "Knowing Smirk", description: "A raised eyebrow and a knowing sideways smirk." },
  { id: "playful-wink", label: "Playful Wink", description: "A playful wink and lopsided grin." },
  { id: "side-eye", label: "Side Eye", description: "A sly sideways glance and tiny smile." },
  { id: "secret-grin", label: "Secret Grin", description: "A cheeky grin with eyes looking upward." },
  { id: "scheming-chin", label: "Scheming Chin", description: "A conspiratorial smile with one hand at the chin." },
] as const satisfies readonly AssetMetadata[];

export const BACKGROUND_COUNT = backgroundMetadata.length;

/** Identifiers for the two procedurally generated move cues. */
export type MoveSoundId = "player-move" | "computer-move";

// Labels/descriptions are shared; platform loaders supply the audio sources.
export const moveSoundMetadata = [
  {
    id: "player-move",
    label: "Your move",
    description: "A bright rising chime plays whenever you place a mark.",
  },
  {
    id: "computer-move",
    label: "Modi's move",
    description: "A lower, rounded knock plays whenever the computer places a mark.",
  },
] as const satisfies readonly { id: MoveSoundId; label: string; description: string }[];

/** Registries share metadata/order while keeping all image references static. */
export function createAssetRegistry<Source>(
  opponentSource: Source,
  backgroundSources: Readonly<Record<(typeof backgroundMetadata)[number]["id"], Source>>,
): AssetRegistry<Source> {
  return {
    opponent: { metadata: opponentMetadata, source: opponentSource },
    backgrounds: backgroundMetadata.map((metadata) => ({
      metadata,
      source: backgroundSources[metadata.id],
    })),
  };
}

/** Audio sources keyed by actor; kept separate from artwork loaders. */
export interface SoundRegistry<Source> {
  readonly playerMove: Source;
  readonly computerMove: Source;
}

/** Platform registries share metadata/order while keeping audio references static. */
export function createSoundRegistry<Source>(
  sources: Readonly<Record<MoveSoundId, Source>>,
): SoundRegistry<Source> {
  return {
    playerMove: sources["player-move"],
    computerMove: sources["computer-move"],
  };
}
