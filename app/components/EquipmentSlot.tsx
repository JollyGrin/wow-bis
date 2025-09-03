'use client';

import type { Item } from '@/app/lib/items-service';

interface EquipmentSlotProps {
  slotName: string;
  items: Item[];
}

const SLOT_ORDER = [
  'Head', 'Neck', 'Shoulder', 'Back', 'Chest', 'Wrist',
  'Hands', 'Waist', 'Legs', 'Feet', 'Finger', 'Trinket',
  'Main Hand', 'Off Hand', 'Two-Hand', 'Ranged'
];

export function EquipmentSlot({ slotName, items }: EquipmentSlotProps) {
  return (
    <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      <div className="w-32 flex-shrink-0">
        <h3 className="font-semibold text-gray-800">{slotName}</h3>
      </div>
      
      <div className="flex-1 relative">
        <div className="h-12 bg-gray-100 rounded relative overflow-hidden">
          {/* Level bar background with markers */}
          <div className="absolute inset-0 flex">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-gray-300 last:border-r-0"
              />
            ))}
          </div>
          
          {/* Level indicators */}
          <div className="absolute -top-6 inset-x-0 flex justify-between text-xs text-gray-500">
            <span>1</span>
            <span>10</span>
            <span>20</span>
            <span>30</span>
            <span>40</span>
            <span>50</span>
            <span>60</span>
          </div>
          
          {/* Item icons positioned on the bar */}
          {items.map((item) => {
            const position = ((item.requiredLevel - 1) / 59) * 100;
            return (
              <a
                key={item.itemId}
                href={`https://www.wowhead.com/classic/item=${item.itemId}`}
                className="absolute top-1 w-10 h-10 -translate-x-1/2 cursor-pointer group"
                style={{ left: `${position}%` }}
                data-wowhead={`item=${item.itemId}`}
              >
                <img
                  src={`https://wow.zamimg.com/images/wow/icons/medium/${item.icon}.jpg`}
                  alt={item.name}
                  className={`w-full h-full rounded border-2 ${
                    item.quality === 'Epic' ? 'border-purple-600' :
                    item.quality === 'Rare' ? 'border-blue-600' :
                    item.quality === 'Uncommon' ? 'border-green-600' :
                    'border-gray-600'
                  } group-hover:scale-110 transition-transform`}
                />
              </a>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}

export function EquipmentSlotList({ items }: { items: Item[] }) {
  // Group items by slot
  const itemsBySlot = items.reduce((acc, item) => {
    if (!acc[item.slot]) {
      acc[item.slot] = [];
    }
    acc[item.slot]!.push(item);
    return acc;
  }, {} as Record<string, Item[]>);
  
  // Sort items within each slot by required level
  Object.keys(itemsBySlot).forEach(slot => {
    itemsBySlot[slot]?.sort((a, b) => a.requiredLevel - b.requiredLevel);
  });
  
  return (
    <div className="space-y-4">
      {SLOT_ORDER.filter(slot => slot !== 'Two-Hand' || !itemsBySlot['Main Hand'])
        .map((slot) => (
          <EquipmentSlot
            key={slot}
            slotName={slot}
            items={itemsBySlot[slot] || []}
          />
        ))}
    </div>
  );
}