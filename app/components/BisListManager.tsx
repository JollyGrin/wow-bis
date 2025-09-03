"use client";

import { useState, useEffect } from "react";
import type { Item } from "../lib/items-service";
import {
  BisListStorage,
  UrlSharingService,
  type BisListSummary,
  type BisList,
} from "../lib/bis-list-storage";

interface BisListManagerProps {
  currentItems: Item[];
  onLoadList: (items: Item[]) => void;
  onItemsFromUrl: (itemIds: number[]) => void;
  onAutoSave: (items: Item[]) => void;
}

export function BisListManager({
  currentItems,
  onLoadList,
  onItemsFromUrl,
  onAutoSave,
}: BisListManagerProps) {
  const [savedLists, setSavedLists] = useState<BisListSummary[]>([]);
  const [activeList, setActiveList] = useState<BisList | null>(null);
  const [showNewListDialog, setShowNewListDialog] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [shareUrl, setShareUrl] = useState("");
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
    setNewListName("");
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
    if (confirm("Are you sure you want to delete this BiS list?")) {
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
      alert("URL copied to clipboard!");
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("URL copied to clipboard!");
    }
  };

  return (
    <div className="wow-card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold wow-title">
            {activeList
              ? `📜 ${activeList.name}`
              : "📜 No Gear Roster Selected"}
          </h3>
          {activeList && (
            <p className="text-sm wow-subtitle">
              {currentItems.length} items • Auto-saves as you adventure
            </p>
          )}
        </div>
        {activeList && (
          <div className="text-xs text-yellow-300 bg-gradient-to-r from-green-800 to-green-700 px-3 py-1 rounded border border-yellow-500">
            ⚡ Active Roster
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowNewListDialog(true)}
          className="px-4 py-2 rounded-lg wow-button"
        >
          📜 New Roster
        </button>

        <button
          onClick={handleShare}
          disabled={currentItems.length === 0}
          className="px-4 py-2 rounded-lg wow-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔗 Share Roster
        </button>

        {activeList && (
          <button
            onClick={handleDeleteCurrent}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-800 to-red-700 border-2 border-red-600 text-white hover:from-red-700 hover:to-red-600 transition-all"
          >
            🗑 Delete Current
          </button>
        )}
      </div>

      {savedLists.length > 0 && (
        <div>
          <h4 className="font-medium wow-title mb-3">
            🏰 All Gear Rosters ({savedLists.length})
          </h4>
          <div className="space-y-2">
            {savedLists.map((list) => (
              <div
                key={list.id}
                className={`flex items-center justify-between rounded-lg p-3 ${
                  activeList?.id === list.id
                    ? "bg-gradient-to-r from-green-900 to-green-800 border-2 border-yellow-500"
                    : "wow-card-light"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-yellow-300">
                      📜 {list.name}
                    </span>
                    {activeList?.id === list.id && (
                      <span className="text-xs bg-yellow-600 text-gray-900 px-2 py-0.5 rounded font-bold">
                        ⚡ ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-300">
                    {list.itemCount} items •{" "}
                    {list.updatedAt.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  {activeList?.id !== list.id && (
                    <button
                      onClick={() => handleSwitchList(list.id)}
                      className="px-3 py-1 text-sm wow-button-secondary"
                    >
                      Switch To
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(list.id)}
                    className="px-3 py-1 text-sm bg-gradient-to-r from-red-700 to-red-600 border border-red-500 text-white rounded hover:from-red-600 hover:to-red-500 transition-all"
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="wow-card p-6 w-96">
            <h4 className="text-lg font-semibold mb-4 wow-title">
              📜 Create New Gear Roster
            </h4>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Enter roster name..."
              className="w-full px-3 py-2 bg-gray-800 border border-yellow-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 mb-4 text-white placeholder-gray-400"
              onKeyPress={(e) => e.key === "Enter" && handleNewList()}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleNewList}
                disabled={!newListName.trim()}
                className="px-4 py-2 rounded-lg wow-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⚡ Create
              </button>
              <button
                onClick={() => {
                  setShowNewListDialog(false);
                  setNewListName("");
                }}
                className="px-4 py-2 rounded-lg wow-button-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="wow-card p-6 w-96">
            <h4 className="text-lg font-semibold mb-4 wow-title">
              🔗 Share Gear Roster
            </h4>
            <p className="text-sm wow-subtitle mb-3">
              Share this URL to let other adventurers load your roster:
            </p>
            <div className="bg-gray-800 border border-yellow-600 rounded-lg p-3 mb-4 break-all text-sm text-gray-200">
              {shareUrl}
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 rounded-lg wow-button"
              >
                📋 Copy URL
              </button>
              <button
                onClick={() => {
                  setShowShareDialog(false);
                  setShareUrl("");
                }}
                className="px-4 py-2 rounded-lg wow-button-secondary"
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
