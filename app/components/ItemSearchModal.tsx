'use client';

import { useState, useCallback, useEffect } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { itemsAPI } from '@/app/lib/api-client';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import type { Item } from '@/app/lib/items-service';

interface ItemSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: Item) => void;
}

export function ItemSearchModal({ isOpen, onClose, onSelectItem }: ItemSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    slot: '',
    quality: '',
    minLevel: '',
    maxLevel: '',
    class: '',
  });

  // Fetch metadata for filter options
  const { data: metadata } = useQuery({
    queryKey: ['items-metadata'],
    queryFn: itemsAPI.getMetadata,
    staleTime: 5 * 60 * 1000,
  });

  // Infinite query for items
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['items-search', searchQuery, filters],
    queryFn: ({ pageParam = 1 }) =>
      itemsAPI.search({
        query: searchQuery,
        slot: filters.slot || undefined,
        quality: filters.quality || undefined,
        minLevel: filters.minLevel ? parseInt(filters.minLevel) : undefined,
        maxLevel: filters.maxLevel ? parseInt(filters.maxLevel) : undefined,
        class: filters.class || undefined,
        page: pageParam,
        limit: 20,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: isOpen,
  });

  // Infinite scroll
  const loadMoreRef = useInfiniteScroll({
    onLoadMore: fetchNextPage,
    hasMore: hasNextPage || false,
    isLoading: isFetchingNextPage,
  });

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setFilters({
        slot: '',
        quality: '',
        minLevel: '',
        maxLevel: '',
        class: '',
      });
    }
  }, [isOpen]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const allItems = data?.pages.flatMap(page => page.data) || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Search Items</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
            <select
              value={filters.slot}
              onChange={(e) => handleFilterChange('slot', e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Slots</option>
              {metadata?.slots.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>

            <select
              value={filters.quality}
              onChange={(e) => handleFilterChange('quality', e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Qualities</option>
              {metadata?.qualities.map(quality => (
                <option key={quality} value={quality}>{quality}</option>
              ))}
            </select>

            <select
              value={filters.class}
              onChange={(e) => handleFilterChange('class', e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Classes</option>
              {metadata?.classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Min Level"
              value={filters.minLevel}
              onChange={(e) => handleFilterChange('minLevel', e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
              min="1"
              max="60"
            />

            <input
              type="number"
              placeholder="Max Level"
              value={filters.maxLevel}
              onChange={(e) => handleFilterChange('maxLevel', e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
              min="1"
              max="60"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-600">Loading items...</div>
          ) : allItems.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No items found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allItems.map((item) => (
                <div
                  key={item.itemId}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    onSelectItem(item);
                    onClose();
                  }}
                >
                  <img
                    src={`https://wow.zamimg.com/images/wow/icons/medium/${item.icon}.jpg`}
                    alt={item.name}
                    className={`w-12 h-12 rounded border-2 ${
                      item.quality === 'Epic' ? 'border-purple-600' :
                      item.quality === 'Rare' ? 'border-blue-600' :
                      item.quality === 'Uncommon' ? 'border-green-600' :
                      'border-gray-600'
                    }`}
                  />
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      item.quality === 'Epic' ? 'text-purple-600' :
                      item.quality === 'Rare' ? 'text-blue-600' :
                      item.quality === 'Uncommon' ? 'text-green-600' :
                      'text-gray-800'
                    }`}>
                      {item.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {item.slot} • Level {item.requiredLevel} • {item.class}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Infinite scroll trigger */}
          {hasNextPage && (
            <div ref={loadMoreRef} className="py-4 text-center">
              {isFetchingNextPage ? (
                <span className="text-gray-600">Loading more...</span>
              ) : (
                <span className="text-gray-400">Scroll for more</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}