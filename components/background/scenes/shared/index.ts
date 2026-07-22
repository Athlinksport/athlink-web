import type { ComponentType } from "react";

export type SceneDefinition = {
  matches: (pathname: string) => boolean;
  Component: ComponentType;
};
