import type { AnimalDef } from "../types";

export const ANIMALS: AnimalDef[] = [
  {
    id: "dog",
    name: "Dog",
    tiers: [
      { tier: "common",    emoji: "🐶", label: "Pup",          color: "#c8a96e", cost: 0 },
      { tier: "uncommon",  emoji: "🐕", label: "Good Boy",     color: "#e8c87a", cost: 15 },
      { tier: "rare",      emoji: "🦮", label: "Guide Hound",  color: "#7ecfff", cost: 40,  aura: "#7ecfff" },
      { tier: "epic",      emoji: "🐕‍🦺", label: "Super Pup",  color: "#c97bff", cost: 100, aura: "#c97bff" },
      { tier: "legendary", emoji: "🌟", label: "Star Hound",   color: "#ffd700", cost: 220, aura: "#ffd700" },
    ],
  },
  {
    id: "cat",
    name: "Cat",
    tiers: [
      { tier: "common",    emoji: "🐱", label: "Kitten",       color: "#f4a0a0", cost: 0 },
      { tier: "uncommon",  emoji: "🐈", label: "Tabby",        color: "#f9c56e", cost: 15 },
      { tier: "rare",      emoji: "🐈‍⬛", label: "Shadow Cat", color: "#9b7bff", cost: 40,  aura: "#9b7bff" },
      { tier: "epic",      emoji: "😸", label: "Mystic Cat",   color: "#ff7bdc", cost: 100, aura: "#ff7bdc" },
      { tier: "legendary", emoji: "🌙", label: "Moon Cat",     color: "#c0e8ff", cost: 220, aura: "#c0e8ff" },
    ],
  },
  {
    id: "rabbit",
    name: "Rabbit",
    tiers: [
      { tier: "common",    emoji: "🐰", label: "Bunny",        color: "#f9d0d0", cost: 0 },
      { tier: "uncommon",  emoji: "🐇", label: "Hare",         color: "#b8f4b8", cost: 15 },
      { tier: "rare",      emoji: "🐇", label: "Speed Hare",   color: "#7affd4", cost: 40,  aura: "#7affd4" },
      { tier: "epic",      emoji: "🐰", label: "Neon Bunny",   color: "#ff9fff", cost: 100, aura: "#ff9fff" },
      { tier: "legendary", emoji: "⚡", label: "Thunder Hare", color: "#fff176", cost: 220, aura: "#fff176" },
    ],
  },
  {
    id: "fox",
    name: "Fox",
    tiers: [
      { tier: "common",    emoji: "🦊", label: "Kit",          color: "#ff8c42", cost: 0 },
      { tier: "uncommon",  emoji: "🦊", label: "Cunning Fox",  color: "#ffb347", cost: 15 },
      { tier: "rare",      emoji: "🦊", label: "Arctic Fox",   color: "#a0d8ef", cost: 40,  aura: "#a0d8ef" },
      { tier: "epic",      emoji: "🦊", label: "Ember Fox",    color: "#ff4444", cost: 100, aura: "#ff4444" },
      { tier: "legendary", emoji: "🔥", label: "Inferno Fox",  color: "#ff6a00", cost: 220, aura: "#ff6a00" },
    ],
  },
  {
    id: "bear",
    name: "Bear",
    tiers: [
      { tier: "common",    emoji: "🐻", label: "Cub",          color: "#a0785a", cost: 0 },
      { tier: "uncommon",  emoji: "🐻", label: "Brown Bear",   color: "#c49a6c", cost: 15 },
      { tier: "rare",      emoji: "🐼", label: "Panda",        color: "#e8e8e8", cost: 40,  aura: "#e8e8e8" },
      { tier: "epic",      emoji: "🐻‍❄️", label: "Ice Bear",  color: "#aee8ff", cost: 100, aura: "#aee8ff" },
      { tier: "legendary", emoji: "✨", label: "Spirit Bear",  color: "#ffe0ff", cost: 220, aura: "#ffe0ff" },
    ],
  },
  {
    id: "frog",
    name: "Frog",
    tiers: [
      { tier: "common",    emoji: "🐸", label: "Tadpole",      color: "#78c878", cost: 0 },
      { tier: "uncommon",  emoji: "🐸", label: "Tree Frog",    color: "#a0ff78", cost: 15 },
      { tier: "rare",      emoji: "🐸", label: "Dart Frog",    color: "#ff7b7b", cost: 40,  aura: "#ff7b7b" },
      { tier: "epic",      emoji: "🐸", label: "Neon Frog",    color: "#00ffcc", cost: 100, aura: "#00ffcc" },
      { tier: "legendary", emoji: "🌿", label: "Jungle King",  color: "#00ff88", cost: 220, aura: "#00ff88" },
    ],
  },
];

export const RARITY_COLORS: Record<string, string> = {
  common:    "#aaa",
  uncommon:  "#4caf50",
  rare:      "#2196f3",
  epic:      "#9c27b0",
  legendary: "#ff9800",
};

export const RARITY_LABELS: Record<string, string> = {
  common:    "Common",
  uncommon:  "Uncommon",
  rare:      "Rare",
  epic:      "Epic",
  legendary: "Legendary",
};
