# WoW Best-in-Slot Leveling Tool

A Next.js application for tracking the best-in-slot (BiS) items while leveling in World of Warcraft from levels 1-60. Unlike traditional BiS tools that focus on endgame content, this tool visualizes item progression throughout the leveling journey.

## Project Overview

This tool helps players visualize:
- Which items are best for each equipment slot at every level
- How long each item remains useful before the next upgrade
- A visual timeline showing item progression from 1-60

## Technical Stack

- **Framework**: Next.js 15.5.2 with React 19.1.0
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Data Fetching**: Axios with TanStack React Query
- **Code Quality**: Biome for linting and formatting
- **Package Manager**: pnpm

## Core Features

### Main Interface
- Equipment slot list with horizontal bars representing levels 1-60
- Item icons placed on the bars showing when they become BiS
- Visual representation of item duration/usefulness
- Add button for searching and adding items to slots

### Data Management
- Large dataset (15MB+ items.json with 10,951 items)
- Server-side API using fs to read JSON data
- Client-side caching with React Query
- Tooltip data separation to reduce payload size

### Storage & Sharing
- LocalStorage for saving custom BiS arrangements
- URL-based sharing (future implementation)
- Efficient storage without duplicating item data

## Project Structure

```
app/
├── api/              # API routes for item data access
├── components/       # React components
│   ├── ItemSlot/     # Equipment slot visualization
│   ├── ItemSearch/   # Item search interface
│   └── LevelBar/     # Level 1-60 timeline bar
├── hooks/            # Custom React hooks
├── lib/              # Utility functions and data processing
└── types/            # TypeScript type definitions
```

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint
```

## Implementation Notes

### Performance Considerations
- Item data is served through API endpoints to avoid loading the entire 15MB dataset
- Tooltip information is loaded on-demand
- React Query handles caching and data synchronization

### Data Structure

The `items.json` file contains an array of 10,951 items with the following structure:

```typescript
interface Item {
  itemId: number;           // Unique item identifier
  name: string;             // Item display name
  icon: string;             // Icon filename (e.g., "inv_sword_19")
  class: string;            // Item class (e.g., "Weapon", "Armor")
  subclass: string;         // Item subclass (e.g., "Sword", "Plate")
  sellPrice: number;        // Vendor sell price in copper
  quality: string;          // "Uncommon" | "Rare" | "Epic" | "Legendary" | "Heirloom"
  itemLevel: number;        // Item's level (affects stats)
  requiredLevel: number;    // Min character level to equip
  slot: string;             // Equipment slot (see below)
  tooltip: TooltipLine[];   // Rich tooltip information
  itemLink: string;         // WoW hyperlink format
  contentPhase: number;     // Classic WoW content phase (1-6)
  source?: {                // Optional drop source info
    category: string;       // "Boss Drop" | "Quest" | "Rare Drop" | "Vendor" | "Zone Drop"
    dropChance?: number;    // Drop rate percentage
  };
  uniqueName: string;       // URL-friendly unique identifier
}

interface TooltipLine {
  label: string;            // Tooltip text
  format?: string;          // "alignRight" | "indent" | "Misc" | quality colors
}
```

#### Equipment Slots
Available slot values:
- **Armor**: Head, Shoulder, Chest, Waist, Legs, Feet, Wrist, Hands, Back, Shirt, Tabard
- **Weapons**: Main Hand, Off Hand, One-Hand, Two-Hand
- **Accessories**: Neck, Finger, Trinket
- **Ranged**: Ranged, Thrown, Ammo, Relic
- **Other**: Held In Off-hand

### Working with Item Icons
Item icons are fetched from Blizzard's CDN using the `icon` field:

```typescript
// Example icon field: "inv_sword_19"
const getIconUrl = (icon: string, size: 'small' | 'medium' | 'large') => {
  return `https://wow.zamimg.com/images/wow/icons/${size}/${icon}.jpg`;
};

// Available sizes:
// small: 18×18
// medium: 36×36  
// large: 56×56
```

### Understanding itemLink
The `itemLink` field contains the in-game WoW hyperlink format:

```
|cffa335ee|Hitem:647::::::::::0|h[Destiny]|h|r
```

Components:
- `|cffa335ee|` - Color code (Epic/purple in this example)
- `Hitem:647::::::::::0` - Encoded item data (ID, enchants, suffixes, etc.)
- `h[Destiny]|h` - Clickable item name
- `|r` - End color formatting

While primarily useful in-game, itemLink can be parsed for:
- Authentic WoW-style tooltip rendering
- Extracting item variations (enchants, suffixes)
- Quality color codes for UI styling

### Wowhead Tooltip Integration
To display interactive tooltips for items, spells, quests, NPCs, and more, integrate Wowhead's tooltip system:

```html
<!-- Add to your app/layout.tsx or _document.tsx -->
<script>const whTooltips = {colorLinks: true, iconizeLinks: true, renameLinks: true};</script>
<script src="https://wow.zamimg.com/js/tooltips.js"></script>
```

Features:
- Automatic tooltip generation for Wowhead links
- Item icons display by default
- Customizable link colors based on item quality
- Support for all Wowhead data types (items, spells, quests, NPCs, achievements, zones, etc.)

Example usage:
```tsx
// Generate a Wowhead link for an item
const getWowheadLink = (itemId: number, itemName: string) => {
  return `<a href="https://www.wowhead.com/classic/item=${itemId}">${itemName}</a>`;
};
```

## Future Enhancements
- URL-based sharing of BiS configurations
- Class and spec filtering
- Import/export functionality
- Mobile-responsive design
- Item source information integration