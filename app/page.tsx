'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EquipmentSlotList } from './components/EquipmentSlot';
import { ItemSearchModal } from './components/ItemSearchModal';
import { BisListManager } from './components/BisListManager';
import { itemsAPI } from './lib/api-client';
import type { Item } from './lib/items-service';

export default function Home() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [showScrubber, setShowScrubber] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(30);
  const [bestItems, setBestItems] = useState<Record<string, Item>>({});

  const handleSelectItem = (item: Item) => {
    setSelectedItems(prev => [...prev, item]);
  };

  const handleBestItemsChange = useCallback((level: number, items: Record<string, Item>) => {
    setCurrentLevel(level);
    setBestItems(items);
  }, []);

  const handleLoadItems = useCallback((items: Item[]) => {
    setSelectedItems(items);
  }, []);

  const handleItemsFromUrl = useCallback(async (itemIds: number[]) => {
    try {
      const items = await itemsAPI.getBatch(itemIds);
      setSelectedItems(items);
    } catch (error) {
      console.error('Error loading items from URL:', error);
    }
  }, []);

  const handleAutoSave = useCallback(() => {
    // Auto-save is handled internally by the BisListManager component
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                WoW Best-in-Slot Leveling Tool
              </h1>
              <p className="text-lg text-gray-600">
                Track the best items for each equipment slot while leveling from 1-60
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowScrubber(!showScrubber)}
                className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                  showScrubber 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {showScrubber ? 'Hide' : 'Show'} Scrubber
              </button>
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Item
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
          <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Best Items at Level {currentLevel}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(bestItems).map(([slot, item]) => (
                <div key={slot} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <img
                    src={`https://wow.zamimg.com/images/wow/icons/medium/${item.icon}.jpg`}
                    alt=""
                    className="w-12 h-12 rounded"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{slot}</div>
                    <div className="text-sm text-gray-600">{item.name}</div>
                    <div className="text-xs text-gray-500">Level {item.requiredLevel}</div>
                  </div>
                </div>
              ))}
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