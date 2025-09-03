"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Script from "next/script";
import dynamic from "next/dynamic";
import { EquipmentSlotList } from "./components/EquipmentSlot";
import { ItemSearchModal } from "./components/ItemSearchModal";
import { BisListManager } from "./components/BisListManager";
import { itemsAPI } from "./lib/api-client";
import type { Item } from "./lib/items-service";

const WowModelViewerFixed = dynamic(
  () => import("./components/WowModelViewerFixed"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 text-gray-400 bg-gray-800 rounded-lg">
        Loading 3D model viewer...
      </div>
    ),
  },
);

declare global {
  interface Window {
    WH: any;
    _originalWHMock: any;
    CONTENT_PATH: string;
    WOTLK_TO_RETAIL_DISPLAY_ID_API: string;
  }
}

export default function Home() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [showScrubber, setShowScrubber] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(30);
  const [bestItems, setBestItems] = useState<Record<string, Item>>({});
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const handleSelectItem = (item: Item) => {
    setSelectedItems((prev) => [...prev, item]);
  };

  const handleBestItemsChange = useCallback(
    (level: number, items: Record<string, Item>) => {
      setCurrentLevel(level);
      setBestItems(items);
    },
    [],
  );

  // Convert equipment slot names to model viewer format
  const convertToModelViewerItems = useCallback(
    (items: Record<string, Item>) => {
      const slotMapping: Record<string, string> = {
        Head: "head",
        Neck: "neck",
        Shoulder: "shoulder",
        Back: "back",
        Chest: "chest",
        Wrist: "wrists",
        Hands: "hands",
        Waist: "waist",
        Legs: "legs",
        Feet: "feet",
        Finger: "finger1",
        Trinket: "trinket1",
        "Main Hand": "mainHand",
        "Off Hand": "offHand",
        "Two-Hand": "mainHand",
        Ranged: "ranged",
      };

      const modelItems: Record<string, number> = {};

      Object.entries(items).forEach(([slot, item]) => {
        const modelSlot = slotMapping[slot];
        if (modelSlot && item.itemId) {
          modelItems[modelSlot] = item.itemId;
        }
      });

      return modelItems;
    },
    [],
  );

  const handleLoadItems = useCallback((items: Item[]) => {
    setSelectedItems(items);
  }, []);

  const handleItemsFromUrl = useCallback(async (itemIds: number[]) => {
    try {
      const items = await itemsAPI.getBatch(itemIds);
      setSelectedItems(items);
    } catch (error) {
      console.error("Error loading items from URL:", error);
    }
  }, []);

  const handleAutoSave = useCallback(() => {
    // Auto-save is handled internally by the BisListManager component
  }, []);

  return (
    <main className="min-h-screen">
      <Script
        id="wh-mock-setup"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            // Create a persistent WH mock that survives script overwrites
            function createWHMock() {
              return {
                debug: function() { console.log('WH.debug called with args:', arguments); },
                getDataEnv: function() { return 'live'; },
                REMOTE: false,
                getImageExtension: function() { 
                  console.log('getImageExtension called');
                  return '.jpg'; 
                },
                Wow: {
                  Item: {
                    getJsonEquip: function(id) { 
                      console.log('getJsonEquip called for item:', id);
                      return { slotbak: 1, displayid: id };
                    }
                  },
                  Character: {
                    getModelOpts: function(race, gender) {
                      console.log('getModelOpts called for race:', race, 'gender:', gender);
                      return {
                        race: race,
                        gender: gender,
                        sk: 1, ha: 1, hc: 1, fa: 1, fh: 1, fc: 1,
                        ep: 1, eq: 1, er: 1, es: 1, et: 1
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
                },
                Texture: {
                  getImageExtension: function() { 
                    console.log('Texture.getImageExtension called');
                    return '.jpg'; 
                  }
                },
                WebP: {
                  getImageExtension: function() { 
                    console.log('WebP.getImageExtension called');
                    return '.jpg'; 
                  }
                }
              };
            }

            window.WH = createWHMock();
            window._originalWHMock = createWHMock();
            
            // CRITICAL: Set content path to use our proxy, not localhost:3001
            window.CONTENT_PATH = '/api/wowhead-proxy/modelviewer/classic/';
            window.WOTLK_TO_RETAIL_DISPLAY_ID_API = undefined;
            
            // Also set these for compatibility with different viewer versions
            (window as any).WOW_MODEL_VIEWER_PATH = '/api/wowhead-proxy/modelviewer/classic/';
            (window as any).WOW_CONTENT_PATH = '/api/wowhead-proxy/modelviewer/classic/';
            
            window.getImageExtension = function() {
              console.log('Global getImageExtension called');
              return '.jpg';
            };
            
            console.log('Environment variables set:');
            console.log('CONTENT_PATH:', window.CONTENT_PATH);
            console.log('WOW_MODEL_VIEWER_PATH:', (window as any).WOW_MODEL_VIEWER_PATH);
            console.log('WOW_CONTENT_PATH:', (window as any).WOW_CONTENT_PATH);
          `,
        }}
      />
      <Script
        src="https://code.jquery.com/jquery-3.6.0.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="/api/wowhead-proxy/modelviewer/classic/viewer/viewer.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("ZamModelViewer loaded, checking WH object...");
          console.log("WH after script load:", window.WH);
          console.log("WH.debug after script load:", typeof window.WH?.debug);

          // Always ensure WH.debug is available - it gets called during WebGL init
          const ensureWHDebug = () => {
            if (!window.WH || typeof window.WH.debug !== "function") {
              console.log("Restoring/ensuring WH object with debug...");

              // Restore full mock if needed
              if (!window.WH) {
                window.WH = window._originalWHMock;
              } else {
                // Just add missing functions to existing WH
                if (typeof window.WH.debug !== "function") {
                  window.WH.debug = function () {
                    console.log("WH.debug called with args:", arguments);
                  };
                }
                if (typeof window.WH.getImageExtension !== "function") {
                  window.WH.getImageExtension = function () {
                    console.log("WH.getImageExtension called");
                    return ".jpg";
                  };
                }
                if (!window.WH.WebP) {
                  window.WH.WebP = {};
                }
                if (typeof window.WH.WebP.getImageExtension !== "function") {
                  window.WH.WebP.getImageExtension = function () {
                    console.log("WH.WebP.getImageExtension called");
                    return ".jpg";
                  };
                }
                if (!window.WH.Texture) {
                  window.WH.Texture = {};
                }
                if (typeof window.WH.Texture.getImageExtension !== "function") {
                  window.WH.Texture.getImageExtension = function () {
                    console.log("WH.Texture.getImageExtension called");
                    return ".jpg";
                  };
                }
              }
            }
          };

          // Ensure WH.debug is available immediately
          ensureWHDebug();

          // CRITICAL: Re-establish environment variables after script load
          // The model viewer script might overwrite these
          window.CONTENT_PATH = "/api/wowhead-proxy/modelviewer/classic/";
          (window as any).WOTLK_TO_RETAIL_DISPLAY_ID_API = undefined;
          (window as any).WOW_MODEL_VIEWER_PATH =
            "/api/wowhead-proxy/modelviewer/classic/";
          (window as any).WOW_CONTENT_PATH =
            "/api/wowhead-proxy/modelviewer/classic/";

          console.log(
            "Re-established environment variables after script load:",
          );
          console.log("CONTENT_PATH:", window.CONTENT_PATH);
          console.log(
            "WOW_MODEL_VIEWER_PATH:",
            (window as any).WOW_MODEL_VIEWER_PATH,
          );

          // Also set up a periodic check to catch any overwrites during initialization
          const debugCheck = setInterval(() => {
            if (!window.WH || typeof window.WH.debug !== "function") {
              console.log("WH.debug missing during init, restoring...");
              ensureWHDebug();
            }

            // Also restore environment variables if they get overwritten
            if (
              window.CONTENT_PATH !== "/api/wowhead-proxy/modelviewer/classic/"
            ) {
              console.log("CONTENT_PATH was overwritten, restoring...");
              window.CONTENT_PATH = "/api/wowhead-proxy/modelviewer/classic/";
              (window as any).WOW_MODEL_VIEWER_PATH =
                "/api/wowhead-proxy/modelviewer/classic/";
              (window as any).WOW_CONTENT_PATH =
                "/api/wowhead-proxy/modelviewer/classic/";
            }
          }, 10);

          // Stop checking after 2 seconds
          setTimeout(() => {
            clearInterval(debugCheck);
            console.log("WH.debug and environment monitoring stopped");
          }, 2000);

          setScriptLoaded(true);
        }}
      />
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 wow-card p-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold wow-title mb-4">
                ⚔️ WoW Best-in-Slot Leveling Tool ⚔️
              </h1>
              <p className="text-lg wow-subtitle">
                Track the finest gear for each equipment slot while ascending from
                level 1 to 60
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowScrubber(!showScrubber)}
                className={`px-6 py-3 rounded-lg flex items-center gap-2 ${
                  showScrubber
                    ? "wow-button-secondary"
                    : "wow-button-secondary"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                {showScrubber ? "Hide" : "Show"} Level Scrubber
              </button>
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="px-6 py-3 rounded-lg flex items-center gap-2 wow-button"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                ⚡ Add Item
              </button>
            </div>
          </div>
        </header>

        <BisListManager
          currentItems={selectedItems}
          onLoadList={handleLoadItems}
          onItemsFromUrl={handleItemsFromUrl}
          onAutoSave={handleAutoSave}
        />

        {showScrubber && Object.keys(bestItems).length > 0 && (
          <div className="sticky top-4 z-50 mb-8 wow-card p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Items List */}
              <div className="lg:col-span-2">
                <h3 className="text-xl font-semibold mb-4 wow-title">
                  ⚡ Optimal Gear at Level {currentLevel} ⚡
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(bestItems).map(([slot, item]) => (
                    <div
                      key={slot}
                      className="flex items-center gap-3 p-3 wow-card-light rounded-lg"
                    >
                      <a
                        href={`https://www.wowhead.com/classic/item=${item.itemId}`}
                        className="flex-shrink-0 cursor-pointer group block"
                        data-wowhead={`item=${item.itemId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={`https://wow.zamimg.com/images/wow/icons/medium/${item.icon}.jpg`}
                          alt={item.name}
                          className={`w-12 h-12 rounded border-2 ${
                            item.quality === "Epic"
                              ? "border-purple-600"
                              : item.quality === "Rare"
                                ? "border-blue-600"
                                : item.quality === "Uncommon"
                                  ? "border-green-600"
                                  : "border-gray-600"
                          } group-hover:scale-110 transition-transform`}
                        />
                      </a>
                      <div>
                        <div className="font-medium text-yellow-300 font-semibold">{slot}</div>
                        <div className="text-sm text-gray-200">{item.name}</div>
                        <div className="text-xs text-gray-300">
                          Level {item.requiredLevel}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3D Model Viewer */}
              <div className="lg:col-span-1">
                <h3 className="text-xl font-semibold mb-4 wow-title">
                  ⚔️ Champion Preview
                </h3>
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden border-2 border-yellow-600">
                  {scriptLoaded ? (
                    <WowModelViewerFixed
                      race={1} // Human for now
                      gender={0} // Male for now
                      items={convertToModelViewerItems(bestItems)}
                      width={300}
                      height={400}
                      className="w-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-96 text-yellow-300">
                      ⚡ Summoning Champion... ⚡
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <EquipmentSlotList
          items={selectedItems}
          showScrubber={showScrubber}
          onBestItemsChange={handleBestItemsChange}
        />

        <ItemSearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          onSelectItem={handleSelectItem}
        />
      </div>
    </main>
  );
}
