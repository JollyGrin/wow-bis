import { useMemo } from 'react';
import Image from 'next/image';

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

interface WowheadStaticViewerProps {
  race: number;
  gender: number;
  items: ItemSlots;
  width?: number;
  height?: number;
  className?: string;
}

// Map slot names to slot IDs
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

export default function WowheadStaticViewer({
  race,
  gender,
  items,
  width = 600,
  height = 800,
  className = '',
}: WowheadStaticViewerProps) {
  
  const imageUrl = useMemo(() => {
    // Build the appearance string
    const appearance = `${race}-${gender}`;
    
    // Build items array (19 slots total)
    const itemsArray = new Array(19).fill(0);
    Object.entries(items).forEach(([slot, itemId]) => {
      if (itemId && SLOT_MAP[slot]) {
        itemsArray[SLOT_MAP[slot] - 1] = itemId;
      }
    });
    
    // Wowhead's static render URL format
    // Note: This is a simplified example - the actual URL might need adjustments
    const itemsString = itemsArray.join(',');
    return `https://render-us.worldofwarcraft.com/character/${appearance}/${itemsString}.jpg`;
  }, [race, gender, items]);

  // For now, let's create a placeholder that shows the configuration
  return (
    <div className={`wowhead-static-viewer ${className}`} style={{ width, height }}>
      <div className="bg-gray-700 rounded-lg p-8 h-full flex flex-col items-center justify-center text-center">
        <div className="text-2xl font-bold mb-4">Character Preview</div>
        <div className="space-y-2 text-gray-300">
          <p>Race: {race}</p>
          <p>Gender: {gender === 0 ? 'Male' : 'Female'}</p>
          <div className="mt-4">
            <p className="font-semibold mb-2">Equipped Items:</p>
            <div className="text-sm space-y-1">
              {Object.entries(items).map(([slot, itemId]) => (
                <div key={slot} className="flex justify-between">
                  <span className="capitalize">{slot}:</span>
                  <span className="text-green-400">{itemId}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 text-sm text-gray-400">
          3D model viewer integration in progress
        </div>
      </div>
    </div>
  );
}