import { useEffect, useRef } from 'react';

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

interface WowheadWidgetProps {
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

export default function WowheadWidget({
  race,
  gender,
  items,
  width = 600,
  height = 800,
  className = '',
}: WowheadWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Build the item array for the widget
    const itemArray: number[] = new Array(19).fill(0);
    Object.entries(items).forEach(([slot, itemId]) => {
      if (itemId && SLOT_MAP[slot]) {
        itemArray[SLOT_MAP[slot] - 1] = itemId;
      }
    });

    // Create the widget HTML
    const widgetHtml = `
      <script>
        // Create a minimal WH object if it doesn't exist
        if (!window.WH) {
          window.WH = {
            debug: function() {},
            Wow: {
              Character: {
                Races: {}
              }
            }
          };
        }
      </script>
      <div id="model-viewer-widget" style="width: 100%; height: 100%;"></div>
      <script src="https://wow.zamimg.com/widgets/power.js"></script>
      <script>
        const WH = window.WH || { Wow: { Character: { Races: {} } } };
        const viewer = new WowheadDressing();
        viewer.setAppearance({
          race: ${race},
          gender: ${gender},
          items: [${itemArray.join(',')}]
        });
        viewer.render(document.getElementById('model-viewer-widget'));
      </script>
    `;

    // Clear container and add the widget
    containerRef.current.innerHTML = widgetHtml;

    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [race, gender, items]);

  return (
    <div 
      ref={containerRef}
      className={`wowhead-widget ${className}`}
      style={{ width, height }}
    />
  );
}