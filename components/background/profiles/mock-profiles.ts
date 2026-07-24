import type { BackgroundProfile } from "./types";

export const mockBackgroundProfiles: readonly BackgroundProfile[] = [
  { id: "maya", firstName: "Maya", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=70", allowPublicBackground: true },
  { id: "noah", firstName: "Noah", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&q=70", allowPublicBackground: true },
  { id: "ines", firstName: "Inès", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=96&q=70", allowPublicBackground: true },
  { id: "liam", firstName: "Liam", avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=96&q=70", allowPublicBackground: true },
  { id: "sofia", firstName: "Sofia", avatarUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=96&q=70", allowPublicBackground: true },
  { id: "lucas", firstName: "Lucas", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&q=70", allowPublicBackground: true },
  { id: "amina", firstName: "Amina", avatarUrl: null, allowPublicBackground: true },
  { id: "hugo", firstName: "Hugo", avatarUrl: null, allowPublicBackground: false },
  { id: "zoe", firstName: "Zoé", avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=96&q=70", allowPublicBackground: false },
  { id: "adam", firstName: "Adam", avatarUrl: null, allowPublicBackground: false },
];
