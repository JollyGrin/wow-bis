// Comprehensive category configuration based on TURTLE_ITEMS_FETCH.md
export const CATEGORY_CONFIG = {
  // Weapons (2.0 - 2.20)
  "2.0": { name: "1h-axes", type: "weapons" },
  "2.1": { name: "2h-axes", type: "weapons" },
  "2.2": { name: "bows", type: "weapons" },
  "2.3": { name: "guns", type: "weapons" },
  "2.4": { name: "1h-maces", type: "weapons" },
  "2.5": { name: "2h-maces", type: "weapons" },
  "2.6": { name: "polearms", type: "weapons" },
  "2.7": { name: "1h-swords", type: "weapons" },
  "2.8": { name: "2h-swords", type: "weapons" },
  "2.10": { name: "staves", type: "weapons" },
  "2.13": { name: "fist", type: "weapons" },
  "2.14": { name: "miscellaneous", type: "weapons" },
  "2.15": { name: "daggers", type: "weapons" },
  "2.16": { name: "thrown", type: "weapons" },
  "2.17": { name: "spears", type: "weapons" },
  "2.18": { name: "crossbows", type: "weapons" },
  "2.19": { name: "wands", type: "weapons" },
  "2.20": { name: "fishing-poles", type: "weapons" },

  // Armor - Accessories
  "4.0.2": { name: "amulets", type: "armor" },
  "4.0.11": { name: "rings", type: "armor" },
  "4.0.12": { name: "trinkets", type: "armor" },
  "4.1.16": { name: "cloaks", type: "armor" },
  "4.6.14": { name: "shields", type: "armor" },

  // Cloth Armor (4.1.x) - skipping 4.1.2 and 4.1.4 as noted in docs
  "4.1.1": { name: "cloth-head", type: "armor" },
  "4.1.3": { name: "cloth-shoulder", type: "armor" },
  "4.1.5": { name: "cloth-chest", type: "armor" },
  "4.1.6": { name: "cloth-waist", type: "armor" },
  "4.1.7": { name: "cloth-legs", type: "armor" },
  "4.1.8": { name: "cloth-feet", type: "armor" },
  "4.1.9": { name: "cloth-wrist", type: "armor" },
  "4.1.10": { name: "cloth-hands", type: "armor" },

  // Leather Armor (4.2.x) - following same pattern, skipping .2 and .4
  "4.2.1": { name: "leather-head", type: "armor" },
  "4.2.3": { name: "leather-shoulder", type: "armor" },
  "4.2.5": { name: "leather-chest", type: "armor" },
  "4.2.6": { name: "leather-waist", type: "armor" },
  "4.2.7": { name: "leather-legs", type: "armor" },
  "4.2.8": { name: "leather-feet", type: "armor" },
  "4.2.9": { name: "leather-wrist", type: "armor" },
  "4.2.10": { name: "leather-hands", type: "armor" },

  // Mail Armor (4.3.x) - following same pattern
  "4.3.1": { name: "mail-head", type: "armor" },
  "4.3.3": { name: "mail-shoulder", type: "armor" },
  "4.3.5": { name: "mail-chest", type: "armor" },
  "4.3.6": { name: "mail-waist", type: "armor" },
  "4.3.7": { name: "mail-legs", type: "armor" },
  "4.3.8": { name: "mail-feet", type: "armor" },
  "4.3.9": { name: "mail-wrist", type: "armor" },
  "4.3.10": { name: "mail-hands", type: "armor" },

  // Plate Armor (4.4.x) - following same pattern  
  "4.4.1": { name: "plate-head", type: "armor" },
  "4.4.3": { name: "plate-shoulder", type: "armor" },
  "4.4.5": { name: "plate-chest", type: "armor" },
  "4.4.6": { name: "plate-waist", type: "armor" },
  "4.4.7": { name: "plate-legs", type: "armor" },
  "4.4.8": { name: "plate-feet", type: "armor" },
  "4.4.9": { name: "plate-wrist", type: "armor" },
  "4.4.10": { name: "plate-hands", type: "armor" }
} as const;

export type CategoryId = keyof typeof CATEGORY_CONFIG;
export type CategoryType = "weapons" | "armor";