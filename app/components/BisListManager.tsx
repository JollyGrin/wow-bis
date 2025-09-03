'use client';

import { useState, useEffect } from 'react';
import type { Item } from '../lib/items-service';
import { BisListStorage, UrlSharingService, type BisListSummary, type BisList } from '../lib/bis-list-storage';

interface BisListManagerProps {
  currentItems: Item[];
  onLoadList: (items: Item[]) => void;
  onItemsFromUrl: (itemIds: number[]) => void;
  onAutoSave: (items: Item[]) => void;
}

export function BisListManager({ currentItems, onLoadList, onItemsFromUrl, onAutoSave }: BisListManagerProps) {
  const [savedLists, setSavedLists] = useState<BisListSummary[]>([]);
  const [activeList, setActiveList] = useState<BisList | null>(null);
  const [showNewListDialog, setShowNewListDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);

  useEffect(() => {
    loadSavedLists();
    loadActiveList();
    
    const urlItemIds = UrlSharingService.loadBisListFromUrl();
    if (urlItemIds) {
      onItemsFromUrl(urlItemIds);
      UrlSharingService.clearUrlParams();
    }
  }, [onItemsFromUrl]);

  // Auto-save whenever items change
  useEffect(() => {
    if (activeList && currentItems.length >= 0) {
      BisListStorage.autoSaveCurrentList(currentItems);
      onAutoSave(currentItems);
    }
  }, [currentItems, activeList, onAutoSave]);

  const loadSavedLists = () => {
    setSavedLists(BisListStorage.getListSummaries());
  };

  const loadActiveList = () => {
    const active = BisListStorage.getActiveList();
    setActiveList(active);
    if (active) {
      onLoadList(active.items);
    }
  };

  const handleNewList = () => {
    if (!newListName.trim()) return;
    
    const id = BisListStorage.createNewList(newListName.trim());
    const newList = BisListStorage.getBisList(id);
    
    setActiveList(newList);
    setNewListName('');
    setShowNewListDialog(false);
    loadSavedLists();
    onLoadList([]);
  };

  const handleSwitchList = (listId: string) => {
    const list = BisListStorage.switchToList(listId);
    if (list) {
      setActiveList(list);
      onLoadList(list.items);
    }
  };

  const handleDelete = (listId: string) => {
    if (confirm('Are you sure you want to delete this BiS list?')) {
      BisListStorage.deleteBisList(listId);
      
      // If we deleted the active list, clear the current state
      if (activeList?.id === listId) {
        setActiveList(null);
        onLoadList([]);
      }
      
      loadSavedLists();
    }
  };

  const handleDeleteCurrent = () => {
    if (!activeList) return;
    
    if (confirm(`Are you sure you want to delete "${activeList.name}"?`)) {
      BisListStorage.deleteBisList(activeList.id);
      setActiveList(null);
      onLoadList([]);
      loadSavedLists();
    }
  };

  const handleShare = () => {
    const url = UrlSharingService.shareBisList(currentItems);
    setShareUrl(url);
    setShowShareDialog(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('URL copied to clipboard!');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('URL copied to clipboard!');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {activeList ? activeList.name : 'No List Selected'}
          </h3>
          {activeList && (
            <p className="text-sm text-gray-500">
              {currentItems.length} items • Auto-saves as you work
            </p>
          )}
        </div>
        {activeList && (
          <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            Active List
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowNewListDialog(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          New List
        </button>
        
        <button
          onClick={handleShare}
          disabled={currentItems.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Share List
        </button>
        
        {activeList && (
          <button
            onClick={handleDeleteCurrent}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete Current
          </button>
        )}
      </div>

      {savedLists.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-700 mb-3">All Lists ({savedLists.length})</h4>
          <div className="space-y-2">
            {savedLists.map(list => (
              <div 
                key={list.id} 
                className={`flex items-center justify-between rounded-lg p-3 ${
                  activeList?.id === list.id 
                    ? 'bg-green-50 border-2 border-green-200' 
                    : 'bg-gray-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{list.name}</span>
                    {activeList?.id === list.id && (
                      <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {list.itemCount} items • {list.updatedAt.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  {activeList?.id !== list.id && (
                    <button
                      onClick={() => handleSwitchList(list.id)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Switch To
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(list.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNewListDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h4 className="text-lg font-semibold mb-4">Create New BiS List</h4>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Enter list name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleNewList()}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleNewList}
                disabled={!newListName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewListDialog(false);
                  setNewListName('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h4 className="text-lg font-semibold mb-4">Share BiS List</h4>
            <p className="text-sm text-gray-600 mb-3">Share this URL to let others load your BiS list:</p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 break-all text-sm">
              {shareUrl}
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Copy URL
              </button>
              <button
                onClick={() => {
                  setShowShareDialog(false);
                  setShareUrl('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}