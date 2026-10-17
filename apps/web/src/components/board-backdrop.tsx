import { useEffect, useState } from "react";
import { webAssets } from "@tic-tac-chor/assets/web";

import "./board-backdrop.css";

export interface BoardBackdropProps {
  readonly backgroundIndex: number;
}

/** Mount inside a positioned board container, behind its cells. */
export function BoardBackdrop({ backgroundIndex }: BoardBackdropProps) {
  const requestedIndex =
    Number.isInteger(backgroundIndex) &&
    backgroundIndex >= 0 &&
    backgroundIndex < webAssets.backgrounds.length
      ? backgroundIndex
      : 0;
  const [displayedIndex, setDisplayedIndex] = useState(requestedIndex);
  const [loaded, setLoaded] = useState<readonly boolean[]>(() =>
    webAssets.backgrounds.map(() => false),
  );

  useEffect(() => {
    // Keep the previous artwork visible until its replacement has decoded.
    if (loaded[requestedIndex]) setDisplayedIndex(requestedIndex);
  }, [loaded, requestedIndex]);

  return (
    <div className="board-backdrop" aria-hidden="true">
      {webAssets.backgrounds.map(({ metadata, source }, index) => (
        <img
          key={metadata.id}
          className="board-backdrop__image"
          src={source}
          alt=""
          draggable={false}
          decoding="async"
          loading="eager"
          style={{ opacity: index === displayedIndex ? 1 : 0 }}
          onLoad={() => {
            setLoaded((previous) => {
              if (previous[index]) return previous;
              return previous.map((value, imageIndex) => (imageIndex === index ? true : value));
            });
          }}
        />
      ))}
      <div className="board-backdrop__overlay" />
    </div>
  );
}
