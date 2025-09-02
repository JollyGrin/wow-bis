'use client';

import { useQuery } from '@tanstack/react-query';
import { EquipmentSlotList } from './components/EquipmentSlot';
import { itemsAPI } from './lib/api-client';

export default function Home() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['items', 'initial'],
    queryFn: () => itemsAPI.search({ limit: 50 }),
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            WoW Best-in-Slot Leveling Tool
          </h1>
          <p className="text-lg text-gray-600">
            Track the best items for each equipment slot while leveling from 1-60
          </p>
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
            
            <EquipmentSlotList items={data.data} />
          </div>
        )}
      </div>
    </main>
  );
}