import { useMemo } from 'react';

interface ItemSlots {
  head?: number;
  neck?: number;
  shoulder?: number;
  shirt?: number;
  chest?: number;
  waist?: number;
  legs?: number;
  feet?: number;
  wrists?: number;
  hands?: number;
  finger1?: number;
  finger2?: number;
  trinket1?: number;
  trinket2?: number;
  back?: number;
  mainHand?: number;
  offHand?: number;
  ranged?: number;
  tabard?: number;
}

interface WowheadModelViewerProps {
  race: number;
  gender: number;
  items: ItemSlots;
  width?: number;
  height?: number;
  className?: string;
}

// Map our item slot names to Wowhead's slot IDs
const SLOT_MAP: Record<string, number> = {
  head: 1,
  neck: 2,
  shoulder: 3,
  shirt: 4,
  chest: 5,
  waist: 6,
  legs: 7,
  feet: 8,
  wrists: 9,
  hands: 10,
  finger1: 11,
  finger2: 12,
  trinket1: 13,
  trinket2: 14,
  back: 15,
  mainHand: 16,
  offHand: 17,
  ranged: 18,
  tabard: 19,
};

export default function WowheadModelViewer({
  race,
  gender,
  items,
  width = 600,
  height = 800,
  className = '',
}: WowheadModelViewerProps) {
  const dressupUrl = useMemo(() => {
    // Build the item string for Wowhead's dressing room
    const itemPairs: string[] = [];
    
    Object.entries(items).forEach(([slot, itemId]) => {
      if (itemId && SLOT_MAP[slot]) {
        itemPairs.push(`${SLOT_MAP[slot]}:${itemId}`);
      }
    });
    
    const itemString = itemPairs.join(';');
    const genderChar = gender === 0 ? 'm' : 'f';
    
    // Wowhead dressing room URL format
    return `https://www.wowhead.com/dressing-room#az0z0zJ8zz8${race}${genderChar}8zcca8aa8${itemString ? `8${itemString}` : ''}`;
  }, [race, gender, items]);

  return (
    <div className={`wowhead-model-viewer ${className}`} style={{ width, height }}>
      <iframe
        src={dressupUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 'none', borderRadius: '8px' }}
        title="WoW Character Model"
      />
    </div>
  );
}