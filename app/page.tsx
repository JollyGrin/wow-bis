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

  const handleSelectItem = (item: Item) => {
    setSelectedItems(prev => [...prev, item]);
  };

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
        </header>

        <BisListManager
          currentItems={selectedItems}
          onLoadList={handleLoadItems}
          onItemsFromUrl={handleItemsFromUrl}
          onAutoSave={handleAutoSave}
        />
        
        <EquipmentSlotList items={selectedItems} />

        <ItemSearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          onSelectItem={handleSelectItem}
        />
      </div>
    </main>
  );
}