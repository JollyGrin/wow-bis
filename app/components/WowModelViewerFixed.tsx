import { useEffect, useRef, useState } from 'react';

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

interface WowModelViewerFixedProps {
  race: number;
  gender: number;
  items: ItemSlots;
  width?: number;
  height?: number;
  className?: string;
}

// Map slot names to slot numbers as per wow-model-viewer docs
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

export default function WowModelViewerFixed({
  race,
  gender,
  items,
  width = 600,
  height = 800,
  className = '',
}: WowModelViewerFixedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerId = useRef(`model-viewer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!containerRef.current) return;

    const initializeModelViewer = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Set up environment variables to use our Next.js proxy
        (window as any).CONTENT_PATH = '/api/wowhead-proxy/modelviewer/live/';
        (window as any).WOTLK_TO_RETAIL_DISPLAY_ID_API = 'https://wotlk.murlocvillage.com/api/items';

        // Set container ID
        containerRef.current!.id = containerId.current;

        // Import the wow-model-viewer library
        const { generateModels } = await import('wow-model-viewer');

        // Convert items to the format expected by wow-model-viewer
        // Format: [[slot, itemId], [slot, itemId], ...]
        const itemsArray: Array<[number, number]> = [];
        Object.entries(items).forEach(([slot, itemId]) => {
          if (itemId && SLOT_MAP[slot]) {
            itemsArray.push([SLOT_MAP[slot], itemId]);
          }
        });

        // Create character object as per documentation
        const character = {
          race,
          gender,
          skin: 1,      // Default skin
          face: 0,      // Default face  
          hairStyle: 1, // Default hair style
          hairColor: 1, // Default hair color
          facialStyle: 0, // Default facial style (for male characters)
          items: itemsArray,
        };

        console.log('Creating WoW model with character:', character);

        // Generate the model with aspect ratio 1.0 and container selector
        const model = await generateModels(1.0, `#${containerId.current}`, character);
        
        modelRef.current = model;
        setIsLoading(false);
        
        console.log('WoW model created successfully');
      } catch (err) {
        console.error('Failed to create WoW model:', err);
        setError(err instanceof Error ? err.message : 'Failed to load model viewer');
        setIsLoading(false);
      }
    };

    initializeModelViewer();

    // Cleanup function
    return () => {
      if (modelRef.current && typeof modelRef.current.destroy === 'function') {
        modelRef.current.destroy();
        modelRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [race, gender, items]);

  return (
    <div className={`wow-model-viewer-fixed ${className}`} style={{ width, height, position: 'relative' }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-400 rounded-lg">
          Loading 3D model...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 text-red-400 rounded-lg p-4">
          <div className="text-lg font-semibold mb-2">Model Loading Error</div>
          <div className="text-sm text-center">{error}</div>
          <div className="text-xs text-gray-400 mt-2">
            Check browser console for detailed error information
          </div>
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