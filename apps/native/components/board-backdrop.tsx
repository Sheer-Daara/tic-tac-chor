import { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import { Image } from "expo-image";
import { nativeAssets } from "@tic-tac-chor/assets/native";
import { designTokens, type ColorScheme } from "@tic-tac-chor/design";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const AnimatedImage = Animated.createAnimatedComponent(Image);

export interface BoardBackdropProps {
  readonly backgroundIndex: number;
  readonly colorScheme: ColorScheme;
}

/** Mount inside a positioned board container, behind its cells. */
export function BoardBackdrop({ backgroundIndex, colorScheme }: BoardBackdropProps) {
  const requestedIndex =
    Number.isInteger(backgroundIndex) &&
    backgroundIndex >= 0 &&
    backgroundIndex < nativeAssets.backgrounds.length
      ? backgroundIndex
      : 0;
  const [displayedIndex, setDisplayedIndex] = useState(requestedIndex);
  const [loaded, setLoaded] = useState<readonly boolean[]>(() =>
    nativeAssets.backgrounds.map(() => false),
  );
  const [opacities] = useState(() =>
    nativeAssets.backgrounds.map(
      (_, index) => new Animated.Value(index === requestedIndex ? 1 : 0),
    ),
  );
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Local images still load asynchronously. Never fade out to an unloaded one.
    if (loaded[requestedIndex]) setDisplayedIndex(requestedIndex);
  }, [loaded, requestedIndex]);

  useEffect(() => {
    if (reducedMotion) {
      opacities.forEach((opacity, index) => opacity.setValue(index === displayedIndex ? 1 : 0));
      return;
    }
    const animation = Animated.parallel(
      opacities.map((opacity, index) =>
        Animated.timing(opacity, {
          toValue: index === displayedIndex ? 1 : 0,
          duration: designTokens.motion.backgroundCrossfade,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ),
    );
    animation.start();
    // Rapid restarts retain each layer's current opacity and cancel old work.
    return () => animation.stop();
  }, [displayedIndex, opacities, reducedMotion]);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        backgroundColor: designTokens.themes[colorScheme].surface,
      }}
    >
      {nativeAssets.backgrounds.map(({ metadata, source }, index) => (
        <AnimatedImage
          key={metadata.id}
          source={source}
          contentFit="cover"
          transition={0}
          accessible={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: opacities[index],
          }}
          onLoad={() => {
            setLoaded((previous) => {
              if (previous[index]) return previous;
              return previous.map((value, imageIndex) => (imageIndex === index ? true : value));
            });
          }}
        />
      ))}
      <View
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: designTokens.themes[colorScheme].boardOverlay,
        }}
      />
    </View>
  );
}
