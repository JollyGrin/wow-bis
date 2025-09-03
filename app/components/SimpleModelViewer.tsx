import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    ZamModelViewer: any;
    WH: any;
    jQuery: any;
    $: any;
  }
}

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

interface SimpleModelViewerProps {
  race: number;
  gender: number;
  items: ItemSlots;
  width?: number;
  height?: number;
  className?: string;
}

// Map slot names to Wowhead slot IDs
const SLOT_IDS: Record<string, number> = {
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

export default function SimpleModelViewer({
  race,
  gender,
  items,
  width = 600,
  height = 800,
  className = '',
}: SimpleModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window.ZamModelViewer === 'undefined' || !window.jQuery) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Clear any existing viewer
      if (viewerRef.current) {
        viewerRef.current.destroy?.();
        viewerRef.current = null;
      }
      containerRef.current.innerHTML = '';

      // Create a unique ID for this container
      const containerId = `model-viewer-${Date.now()}`;
      containerRef.current.id = containerId;

      // Create items array for ZamModelViewer
      const itemsArray: Array<[number, number]> = [];
      Object.entries(items).forEach(([slot, itemId]) => {
        if (itemId && SLOT_IDS[slot]) {
          itemsArray.push([SLOT_IDS[slot], itemId]);
        }
      });

      // Mock WH object if it doesn't exist
      if (!window.WH) {
        window.WH = {
          debug: function() {},
          getDataEnv: function() { return 'live'; },
          REMOTE: false,
          Wow: {
            Item: {
              getJsonEquip: function(id: number) { 
                return { slotbak: 1, displayid: id };
              }
            },
            Character: {
              getModelOpts: function(race: number, gender: number) {
                return {
                  race: race,
                  gender: gender,
                  sk: 1,
                  ha: 1,
                  hc: 1,
                  fa: 1,
                  fh: 1,
                  fc: 1,
                  ep: 1,
                  eq: 1,
                  er: 1,
                  es: 1,
                  et: 1
                };
              },
              Races: {
                1: { Race: 1, Name: "Human", Side: 0, FileString: "human" },
                2: { Race: 2, Name: "Orc", Side: 1, FileString: "orc" },
                3: { Race: 3, Name: "Dwarf", Side: 0, FileString: "dwarf" },
                4: { Race: 4, Name: "Night Elf", Side: 0, FileString: "nightelf" },
                5: { Race: 5, Name: "Undead", Side: 1, FileString: "undead" },
                6: { Race: 6, Name: "Tauren", Side: 1, FileString: "tauren" },
                7: { Race: 7, Name: "Gnome", Side: 0, FileString: "gnome" },
                8: { Race: 8, Name: "Troll", Side: 1, FileString: "troll" },
                10: { Race: 10, Name: "Blood Elf", Side: 1, FileString: "bloodelf" },
                11: { Race: 11, Name: "Draenei", Side: 0, FileString: "draenei" }
              }
            }
          }
        };
      }
      
      // Also mock global debug function if needed
      if (typeof window.WH.debug !== 'function') {
        window.WH.debug = function() {};
      }

      // Create the viewer with jQuery container
      const viewer = new window.ZamModelViewer({
        container: window.jQuery(`#${containerId}`),
        type: 2, // Character model
        contentPath: '/api/modelviewer/',
        aspect: width / height, // Calculate aspect ratio
        hd: true,
        models: {
          type: 16, // Player character
          id: `${race}-${gender}`,
          race,
          gender
        },
        items: itemsArray
      });

      viewerRef.current = viewer;
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize model viewer:', err);
      setError('Failed to load model viewer');
      setIsLoading(false);
    }

    // Cleanup
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy?.();
        viewerRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [race, gender, items]);

  return (
    <div className={`simple-model-viewer ${className}`} style={{ width, height, position: 'relative' }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-400 rounded-lg">
          Loading model...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-red-400 rounded-lg">
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
        className="rounded-lg overflow-hidden"
      />
    </div>
  );
}