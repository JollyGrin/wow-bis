import { useEffect, useRef, useState } from "react";

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
  className = "",
}: WowModelViewerFixedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerId = useRef(
    `model-viewer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  );
  
  // Create a stable key for items to prevent unnecessary re-renders
  const itemsKey = Object.entries(items).sort().map(([slot, itemId]) => `${slot}:${itemId}`).join('|');

  useEffect(() => {
    if (!containerRef.current) return;

    const initializeModelViewer = async () => {
      console.log('🎮 Initializing model viewer with items:', itemsKey);
      setIsLoading(true);
      setError(null);

      try {
        // CRITICAL: Ensure environment variables are set correctly before model generation
        // The viewer script might have overwritten these
        (window as any).CONTENT_PATH = '/api/wowhead-proxy/modelviewer/classic/';
        (window as any).WOTLK_TO_RETAIL_DISPLAY_ID_API = undefined;
        (window as any).WOW_MODEL_VIEWER_PATH = '/api/wowhead-proxy/modelviewer/classic/';
        (window as any).WOW_CONTENT_PATH = '/api/wowhead-proxy/modelviewer/classic/';
        
        console.log('🔧 Environment variables set in component:');
        console.log('CONTENT_PATH:', (window as any).CONTENT_PATH);
        console.log('WOTLK_TO_RETAIL_DISPLAY_ID_API:', (window as any).WOTLK_TO_RETAIL_DISPLAY_ID_API);
        console.log('WOW_MODEL_VIEWER_PATH:', (window as any).WOW_MODEL_VIEWER_PATH);

        // Set container ID
        containerRef.current!.id = containerId.current;

        // Import the wow-model-viewer library
        const { generateModels } = await import("wow-model-viewer");

        // Function to get display ID from our API
        const getDisplayId = async (itemId: number): Promise<number> => {
          try {
            const response = await fetch(`/api/item-display-id/${itemId}`);
            if (response.ok) {
              const data = await response.json();
              console.log(`✅ Got display ID for item ${itemId}:`, data);
              return data.displayId;
            } else {
              console.warn(`❌ Failed to get display ID for item ${itemId}`);
              return itemId; // Fallback to item ID
            }
          } catch (error) {
            console.error(`Error getting display ID for item ${itemId}:`, error);
            return itemId; // Fallback to item ID
          }
        };

        // Convert items to display IDs using our API
        const itemsArray: Array<[number, number]> = [];
        
        for (const [slot, itemId] of Object.entries(items)) {
          if (itemId && SLOT_MAP[slot]) {
            const displayId = await getDisplayId(itemId);
            const slotNum = SLOT_MAP[slot];
            
            // Special handling for weapons - try multiple slots
            if (slot === 'mainHand') {
              console.log(`🗡️ Adding weapon to multiple slots for item ${itemId} (display ID: ${displayId})`);
              itemsArray.push([15, displayId]); // Try slot 15 
              itemsArray.push([16, displayId]); // Try slot 16
              itemsArray.push([21, displayId]); // Try slot 21
            } else {
              itemsArray.push([slotNum, displayId]);
            }
            
            console.log(`✅ Mapped item ${itemId} -> display ID ${displayId} in slot ${slotNum}`);
          }
        }
        
        console.log('🎯 Using verified Classic display IDs:', itemsArray);

        // Full character object to get the basic model working
        const character = {
          race,
          gender,
          skin: 1,
          face: 0,
          hairStyle: 1,
          hairColor: 1,
          facialStyle: 0,
          items: itemsArray,
          // Try adding weapon-specific fields that might be needed
          ...(itemsArray.some(([slot]) => [15, 16, 21].includes(slot)) && {
            noCharCustomization: false, // Some weapons might need this
          }),
        };

        console.log("Creating WoW model with character:", character);
        console.log("Items array:", itemsArray);
        console.log("Items object passed in:", items);
        console.log("Window.WH available:", !!(window as any).WH);
        console.log("WH.debug available:", typeof (window as any).WH?.debug);
        console.log("CONTENT_PATH:", (window as any).CONTENT_PATH);
        console.log(
          "WOTLK_TO_RETAIL_DISPLAY_ID_API:",
          (window as any).WOTLK_TO_RETAIL_DISPLAY_ID_API,
        );

        // Check if items array is properly formatted
        if (itemsArray.length === 0) {
          console.warn(
            "No items found in items array - equipment will not show",
          );
        } else {
          console.log("Items will be rendered:", itemsArray.length, "items");
        }

        // Generate the model with aspect ratio 1.0 and container selector
        // For Classic WoW, we need to pass "classic" as the 4th parameter
        console.log("Calling generateModels with classic parameter...");
        const model = await generateModels(
          1.0,
          `#${containerId.current}`,
          character,
          "classic",
        );

        modelRef.current = model;
        setIsLoading(false);

        console.log("WoW model created successfully");
      } catch (err) {
        console.error("Failed to create WoW model:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load model viewer",
        );
        setIsLoading(false);
      }
    };

    initializeModelViewer();

    // Cleanup function
    return () => {
      if (modelRef.current && typeof modelRef.current.destroy === "function") {
        modelRef.current.destroy();
        modelRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [race, gender, itemsKey]);

  return (
    <div
      className={`wow-model-viewer-fixed ${className}`}
      style={{ width, height, position: "relative" }}
    >
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
        style={{ width: "100%", height: "100%" }}
        className="rounded-lg overflow-hidden"
      />
    </div>
  );
}

