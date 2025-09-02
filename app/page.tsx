'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EquipmentSlotList } from './components/EquipmentSlot';
import { ItemSearchModal } from './components/ItemSearchModal';
import { itemsAPI } from './lib/api-client';
import type { Item } from './lib/items-service';

export default function Home() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['items', 'initial'],
    queryFn: () => itemsAPI.search({ limit: 50 }),
  });

  const handleSelectItem = (item: Item) => {
    setSelectedItems(prev => [...prev, item]);
  };

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

        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">Loading items...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">Error loading items: {error.message}</p>
          </div>
        )}

        {data && (
          <div>
            <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">
                Showing {data.data.length} of {data.total} items
              </p>
            </div>
            
            <EquipmentSlotList items={[...data.data, ...selectedItems]} />
          </div>
        )}

        <ItemSearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          onSelectItem={handleSelectItem}
        />
      </div>
    </main>
  );
}