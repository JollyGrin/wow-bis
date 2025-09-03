"use client";

import React, { useState, useRef, useCallback } from "react";
import type { Item } from "@/app/lib/items-service";

interface EquipmentSlotProps {
  slotName: string;
  items: Item[];
  scrubberLevel?: number;
}

const SLOT_ORDER = [
  "Head",
  "Neck",
  "Shoulder",
  "Back",
  "Chest",
  "Wrist",
  "Hands",
  "Waist",
  "Legs",
  "Feet",
  "Finger",
  "Trinket",
  "Main Hand",
  "Off Hand",
  "Ranged",
];

function Scrubber({ 
  onLevelChange, 
  level, 
  containerRef 
}: { 
  onLevelChange: (level: number) => void; 
  level: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newLevel = Math.round(1 + percentage * 59);
    onLevelChange(Math.max(1, Math.min(60, newLevel)));
  }, [isDragging, containerRef, onLevelChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const position = ((level - 1) / 59) * 100;

  return (
    <div
      className="absolute top-0 bottom-0 w-1 bg-yellow-500 cursor-col-resize z-30 hover:w-2 transition-all pointer-events-auto shadow-lg"
      style={{ left: `${position}%` }}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute -top-2 -left-2 w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-yellow-200 shadow-lg" />
      <div className="absolute -bottom-6 -left-4 text-xs text-yellow-300 font-bold bg-gray-800 px-2 py-1 rounded border border-yellow-500">
        ⚡{level}
      </div>
    </div>
  );
}

export function EquipmentSlot({ slotName, items, scrubberLevel }: EquipmentSlotProps) {

  return (
    <div className="flex items-center gap-4 p-4 wow-card-light hover:shadow-lg transition-all duration-300">
      <div className="w-32 flex-shrink-0">
        <h3 className="font-semibold text-yellow-300 font-cinzel text-lg">{slotName}</h3>
      </div>

      <div className="flex-1 relative">
        <div className="h-12 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded relative overflow-hidden border border-yellow-600">
          
          {/* Level bar background with markers */}
          <div className="absolute inset-0 flex">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-yellow-500 last:border-r-0 opacity-30"
              />
            ))}
          </div>

          {/* Level indicators */}
          <div className="absolute -top-6 inset-x-0 text-xs text-yellow-300 font-medium">
            {[1, 10, 20, 30, 40, 50, 60].map(level => {
              const position = ((level - 1) / 59) * 100;
              return (
                <span 
                  key={level}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${position}%` }}
                >
                  {level}
                </span>
              );
            })}
          </div>

          {/* Item icons positioned on the bar */}
          {items.map((item, i) => {
            const position = ((item.requiredLevel - 1) / 59) * 100;
            return (
              <a
                key={item.itemId + "-index-" + i}
                href={`https://www.wowhead.com/classic/item=${item.itemId}`}
                className="absolute top-1 w-10 h-10 -translate-x-1/2 cursor-pointer group block"
                style={{ left: `${position}%` }}
                data-wowhead={`item=${item.itemId}`}
              >
                <img
                  src={`https://wow.zamimg.com/images/wow/icons/medium/${item.icon}.jpg`}
                  alt=""
                  className={`w-full h-full rounded border-2 ${item.quality === "Epic"
                      ? "border-purple-600"
                      : item.quality === "Rare"
                        ? "border-blue-600"
                        : item.quality === "Uncommon"
                          ? "border-green-600"
                          : "border-gray-600"
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

export function EquipmentSlotList({ 
  items, 
  showScrubber = false,
  onBestItemsChange 
}: { 
  items: Item[];
  showScrubber?: boolean;
  onBestItemsChange?: (level: number, bestItems: Record<string, Item>) => void;
}) {
  const [scrubberLevel, setScrubberLevel] = useState(30);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group items by slot
  const itemsBySlot = items.reduce(
    (acc, item) => {
      // Special handling for Two-Hand weapons: they should go in Main Hand slot
      if (item.slot === "Two-Hand") {
        if (!acc["Main Hand"]) {
          acc["Main Hand"] = [];
        }
        acc["Main Hand"]!.push(item);
      }
      // Special handling for One-Hand weapons: they should go in Off Hand slot
      else if (item.slot === "One-Hand") {
        if (!acc["Off Hand"]) {
          acc["Off Hand"] = [];
        }
        acc["Off Hand"]!.push(item);
      } 
      // Special handling for "Held In Off-hand" items: they should go in "Off Hand" slot
      else if (item.slot === "Held In Off-hand") {
        if (!acc["Off Hand"]) {
          acc["Off Hand"] = [];
        }
        acc["Off Hand"]!.push(item);
      }
      else {
        // Handle all other slots normally (Main Hand stays in Main Hand, etc.)
        if (!acc[item.slot]) {
          acc[item.slot] = [];
        }
        acc[item.slot]!.push(item);
      }
      
      return acc;
    },
    {} as Record<string, Item[]>,
  );

  // Sort items within each slot by required level
  Object.keys(itemsBySlot).forEach((slot) => {
    itemsBySlot[slot]?.sort((a, b) => a.requiredLevel - b.requiredLevel);
  });

  const handleLevelChange = useCallback((level: number) => {
    setScrubberLevel(level);
    
    // Find best items for all slots at this level
    const bestItems: Record<string, Item> = {};
    SLOT_ORDER.forEach(slot => {
      const slotItems = itemsBySlot[slot] || [];
      const availableItems = slotItems.filter(item => item.requiredLevel <= level);
      const bestItem = availableItems.reduce((best, item) => 
        !best || item.requiredLevel > best.requiredLevel ? item : best, 
        null as Item | null
      );
      if (bestItem) {
        bestItems[slot] = bestItem;
      }
    });
    
    onBestItemsChange?.(level, bestItems);
  }, [itemsBySlot, onBestItemsChange]);

  return (
    <div className="relative">
      {/* Shared scrubber overlay - only spans timeline portion */}
      {showScrubber && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Offset by slot name width (w-32) and gap (gap-4) */}
          <div 
            ref={containerRef} 
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: 'calc(8rem + 1rem)', right: '1rem' }}
          >
            <div className="relative h-full">
              <Scrubber 
                level={scrubberLevel} 
                onLevelChange={handleLevelChange}
                containerRef={containerRef}
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-4 pointer-events-auto">
        {SLOT_ORDER.map((slot) => (
          <EquipmentSlot
            key={slot}
            slotName={slot}
            items={itemsBySlot[slot] || []}
            scrubberLevel={showScrubber ? scrubberLevel : undefined}
          />
        ))}
      </div>
    </div>
  );
}

