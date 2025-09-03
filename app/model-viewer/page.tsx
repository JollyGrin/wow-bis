"use client";

import { useState } from "react";
import Script from "next/script";
import WowModelViewerFixed from "../components/WowModelViewerFixed";

declare global {
  interface Window {
    WH: any;
    _originalWHMock: any;
    CONTENT_PATH: string;
    WOTLK_TO_RETAIL_DISPLAY_ID_API: string;
  }
}

const RACES = [
	{ id: 1, name: "Human" },
	{ id: 2, name: "Orc" },
	{ id: 3, name: "Dwarf" },
	{ id: 4, name: "Night Elf" },
	{ id: 5, name: "Undead" },
	{ id: 6, name: "Tauren" },
	{ id: 7, name: "Gnome" },
	{ id: 8, name: "Troll" },
	{ id: 10, name: "Blood Elf" },
	{ id: 11, name: "Draenei" },
];

const ITEM_SLOTS = [
	{ key: "head", label: "Head" },
	{ key: "neck", label: "Neck" },
	{ key: "shoulder", label: "Shoulder" },
	{ key: "back", label: "Back" },
	{ key: "chest", label: "Chest" },
	{ key: "shirt", label: "Shirt" },
	{ key: "tabard", label: "Tabard" },
	{ key: "wrists", label: "Wrists" },
	{ key: "hands", label: "Hands" },
	{ key: "waist", label: "Waist" },
	{ key: "legs", label: "Legs" },
	{ key: "feet", label: "Feet" },
	{ key: "finger1", label: "Ring 1" },
	{ key: "finger2", label: "Ring 2" },
	{ key: "trinket1", label: "Trinket 1" },
	{ key: "trinket2", label: "Trinket 2" },
	{ key: "mainHand", label: "Main Hand" },
	{ key: "offHand", label: "Off Hand" },
	{ key: "ranged", label: "Ranged" },
];

// Sample items for demo - Classic WoW items
const SAMPLE_ITEMS = {
	head: 16963, // Helm of Wrath (T2 Warrior)
	chest: 16905, // Bloodfang Chestpiece (T2 Rogue) 
	mainHand: 19019, // Thunderfury (Classic legendary)
	shoulder: 16961, // Pauldrons of Wrath (T2 Warrior)
	legs: 16962, // Legplates of Wrath (T2 Warrior) 
	feet: 16965, // Sabatons of Wrath (T2 Warrior)
	hands: 16964, // Gauntlets of Wrath (T2 Warrior)
	waist: 16960, // Waistband of Wrath (T2 Warrior)
	wrists: 16959, // Bracelets of Wrath (T2 Warrior)
	back: 17102, // Cloak of the Shrouded Mists
};

export default function ModelViewerPage() {
	const [race, setRace] = useState(1); // Human
	const [gender, setGender] = useState(0); // Male
	const [items, setItems] = useState<Record<string, number>>(SAMPLE_ITEMS);
	const [itemInputs, setItemInputs] = useState<Record<string, string>>(() => {
		const inputs: Record<string, string> = {};
		Object.entries(SAMPLE_ITEMS).forEach(([key, value]) => {
			inputs[key] = value.toString();
		});
		return inputs;
	});
	const [scriptLoaded, setScriptLoaded] = useState(false);

	const handleItemChange = (slot: string, value: string) => {
		setItemInputs((prev) => ({ ...prev, [slot]: value }));

		const itemId = parseInt(value);
		if (!isNaN(itemId) && itemId > 0) {
			setItems((prev) => ({ ...prev, [slot]: itemId }));
		} else if (value === "") {
			setItems((prev) => {
				const newItems = { ...prev };
				delete newItems[slot];
				return newItems;
			});
		}
	};

	const loadPreset = (preset: "warrior" | "rogue" | "mage") => {
		let presetItems: Record<string, number> = {};

		switch (preset) {
			case "warrior":
				presetItems = {
					head: 16963, // Helm of Wrath
					shoulder: 16961, // Pauldrons of Wrath
					chest: 16966, // Breastplate of Wrath
					legs: 16962, // Legplates of Wrath
					feet: 16965, // Sabatons of Wrath
					hands: 16964, // Gauntlets of Wrath
					waist: 16960, // Waistband of Wrath
					wrists: 16959, // Bracelets of Wrath
					back: 18541, // Puissant Cape
					mainHand: 19019, // Thunderfury
					offHand: 19349, // Elementium Reinforced Bulwark
				};
				break;
			case "rogue":
				presetItems = {
					head: 16908, // Bloodfang Hood
					shoulder: 16832, // Bloodfang Spaulders
					chest: 16905, // Bloodfang Chestpiece
					legs: 16909, // Bloodfang Pants
					feet: 16906, // Bloodfang Boots
					hands: 16907, // Bloodfang Gloves
					waist: 16910, // Bloodfang Belt
					wrists: 16911, // Bloodfang Bracers
					back: 17102, // Cloak of the Shrouded Mists
					mainHand: 19865, // Warblade of the Hakkari
					offHand: 19866, // Warblade of the Hakkari
				};
				break;
			case "mage":
				presetItems = {
					head: 16914, // Netherwind Crown
					shoulder: 16917, // Netherwind Mantle
					chest: 16916, // Netherwind Robes
					legs: 16915, // Netherwind Pants
					feet: 16912, // Netherwind Boots
					hands: 16913, // Netherwind Gloves
					waist: 16818, // Netherwind Belt
					wrists: 16918, // Netherwind Bindings
					back: 18541, // Puissant Cape
					mainHand: 19356, // Staff of the Shadow Flame
				};
				break;
		}

		setItems(presetItems);
		const newInputs: Record<string, string> = {};
		Object.entries(presetItems).forEach(([key, value]) => {
			newInputs[key] = value.toString();
		});
		setItemInputs(newInputs);
	};

	return (
		<div className="min-h-screen bg-gray-900 text-white p-8">
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
								// Add texture/image related functionality
								Texture: {
									getImageExtension: function() { 
										console.log('Texture.getImageExtension called');
										return '.jpg'; 
									}
								},
								// Add WebP object that the viewer expects
								WebP: {
									getImageExtension: function() { 
										console.log('WebP.getImageExtension called');
										return '.jpg'; 
									}
								}
							};
						}

						// Initialize WH
						window.WH = createWHMock();
						
						// Store our mock functions
						window._originalWHMock = createWHMock();
						
						// Set up environment variables for Classic WoW
						window.CONTENT_PATH = '/api/wowhead-proxy/modelviewer/classic/';
						window.WOTLK_TO_RETAIL_DISPLAY_ID_API = 'https://classic.wowhead.com/api/items';
						
						// Make getImageExtension available globally in multiple contexts
						window.getImageExtension = function() {
							console.log('Global getImageExtension called');
							return '.jpg';
						};
						
						// Also add it to common namespaces that might be used
						if (!window.WH.Texture) {
							window.WH.Texture = {};
						}
						window.WH.Texture.getImageExtension = window.getImageExtension;
						
						// Some libraries expect it on a global 'g' object
						if (!window.g) {
							window.g = {};
						}
						window.g.getImageExtension = window.getImageExtension;
						
						console.log('WH mock object initialized:', window.WH);
						console.log('WH.debug type:', typeof window.WH.debug);
						console.log('Global getImageExtension type:', typeof window.getImageExtension);
					`
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
					console.log('ZamModelViewer loaded, checking WH object...');
					console.log('WH after script load:', window.WH);
					console.log('WH.debug after script load:', typeof window.WH?.debug);
					
					// Always ensure WH.debug is available - it gets called during WebGL init
					const ensureWHDebug = () => {
						if (!window.WH || typeof window.WH.debug !== 'function') {
							console.log('Restoring/ensuring WH object with debug...');
							
							// Restore full mock if needed
							if (!window.WH) {
								window.WH = window._originalWHMock;
							} else {
								// Just add missing functions to existing WH
								if (typeof window.WH.debug !== 'function') {
									window.WH.debug = function() { 
										console.log('WH.debug called with args:', arguments); 
									};
								}
								if (typeof window.WH.getImageExtension !== 'function') {
									window.WH.getImageExtension = function() { 
										console.log('WH.getImageExtension called');
										return '.jpg'; 
									};
								}
								if (!window.WH.WebP) {
									window.WH.WebP = {};
								}
								if (typeof window.WH.WebP.getImageExtension !== 'function') {
									window.WH.WebP.getImageExtension = function() {
										console.log('WH.WebP.getImageExtension called');
										return '.jpg';
									};
								}
								if (!window.WH.Texture) {
									window.WH.Texture = {};
								}
								if (typeof window.WH.Texture.getImageExtension !== 'function') {
									window.WH.Texture.getImageExtension = function() {
										console.log('WH.Texture.getImageExtension called');
										return '.jpg';
									};
								}
							}
						}
					};
					
					// Ensure WH.debug is available immediately
					ensureWHDebug();
					
					// Also set up a periodic check to catch any overwrites during initialization
					const debugCheck = setInterval(() => {
						if (!window.WH || typeof window.WH.debug !== 'function') {
							console.log('WH.debug missing during init, restoring...');
							ensureWHDebug();
						}
					}, 10);
					
					// Stop checking after 2 seconds
					setTimeout(() => {
						clearInterval(debugCheck);
						console.log('WH.debug monitoring stopped');
					}, 2000);
					
					// Re-establish global getImageExtension functions
					window.getImageExtension = function() {
						console.log('Global getImageExtension called');
						return '.jpg';
					};
					
					console.log('WH object ensured with debug support');
					console.log('WH.debug type:', typeof window.WH?.debug);
					console.log('WH.WebP.getImageExtension type:', typeof window.WH?.WebP?.getImageExtension);
					
					// Simple direct approach: patch the global context with all possible getImageExtension variants
					setTimeout(() => {
						try {
							const imageExtensionFunc = function() {
								console.log('getImageExtension called on:', this?.constructor?.name || 'unknown');
								return '.jpg';
							};
							
							// Add to everything we can think of
							window.getImageExtension = imageExtensionFunc;
							
							// Patch the WH object thoroughly
							if (window.WH) {
								window.WH.getImageExtension = imageExtensionFunc;
								if (!window.WH.Texture) window.WH.Texture = {};
								window.WH.Texture.getImageExtension = imageExtensionFunc;
								
								// Also patch g, Ga, etc (common minified names)
								['g', 'Ga', 'getImageExtension', 'texture', 'Texture'].forEach(prop => {
									if (window.WH[prop] && typeof window.WH[prop] === 'object') {
										window.WH[prop].getImageExtension = imageExtensionFunc;
									}
								});
							}
							
							// Patch common global objects
							['g', 'Ga', 'texture', 'Texture', 'WH', 'THREE'].forEach(globalName => {
								if (window[globalName]) {
									try {
										window[globalName].getImageExtension = imageExtensionFunc;
										if (window[globalName].prototype) {
											window[globalName].prototype.getImageExtension = imageExtensionFunc;
										}
									} catch(e) {
										// Ignore read-only properties
									}
								}
							});
							
							// Add a universal fallback by patching undefined access
							const originalPropertyAccessHandler = Object.getOwnPropertyDescriptor(Object.prototype, '__lookupGetter__');
							
							// Override property access for when objects try to access getImageExtension on undefined/null
							const originalObjectGet = Object.getOwnPropertyDescriptor;
							Object.defineProperty(Object.prototype, '__lookupGetter__', {
								value: function(prop) {
									if (prop === 'getImageExtension') {
										console.log('__lookupGetter__ intercepted getImageExtension');
										return imageExtensionFunc;
									}
									return originalPropertyAccessHandler ? originalPropertyAccessHandler.value.call(this, prop) : undefined;
								},
								configurable: true,
								writable: true
							});
							
							// Also patch Reflect.get to catch any missed accesses
							if (window.Reflect && window.Reflect.get) {
								const originalReflectGet = window.Reflect.get;
								window.Reflect.get = function(target, prop, receiver) {
									if (prop === 'getImageExtension' && (!target || target[prop] === undefined)) {
										console.log('Reflect.get intercepted getImageExtension on:', target);
										return imageExtensionFunc;
									}
									return originalReflectGet(target, prop, receiver);
								};
							}
							
							console.log('Patched global contexts for getImageExtension');
							
						} catch(e) {
							console.log('Error in simple patching:', e);
						}
					}, 50);
					
					setScriptLoaded(true);
				}}
			/>
			<h1 className="text-4xl font-bold mb-8">WoW Model Viewer Demo</h1>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<div className="space-y-6">
					<div className="bg-gray-800 p-6 rounded-lg">
						<h2 className="text-2xl font-semibold mb-4">Character Settings</h2>

						<div className="space-y-4">
							<div>
								<label
									htmlFor="race"
									className="block text-sm font-medium mb-2"
								>
									Race
								</label>
								<select
									id="race"
									value={race}
									onChange={(e) => setRace(parseInt(e.target.value))}
									className="w-full px-4 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									{RACES.map((r) => (
										<option key={r.id} value={r.id}>
											{r.name}
										</option>
									))}
								</select>
							</div>

							<div>
								<label
									htmlFor="gender"
									className="block text-sm font-medium mb-2"
								>
									Gender
								</label>
								<select
									id="gender"
									value={gender}
									onChange={(e) => setGender(parseInt(e.target.value))}
									className="w-full px-4 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value={0}>Male</option>
									<option value={1}>Female</option>
								</select>
							</div>
						</div>
					</div>

					<div className="bg-gray-800 p-6 rounded-lg">
						<h2 className="text-2xl font-semibold mb-4">Equipment</h2>

						<div className="mb-4 flex gap-2">
							<button
								onClick={() => loadPreset("warrior")}
								className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors"
							>
								Warrior Set
							</button>
							<button
								onClick={() => loadPreset("rogue")}
								className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors"
							>
								Rogue Set
							</button>
							<button
								onClick={() => loadPreset("mage")}
								className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
							>
								Mage Set
							</button>
						</div>

						<div className="grid grid-cols-2 gap-3">
							{ITEM_SLOTS.map((slot) => (
								<div key={slot.key}>
									<label
										htmlFor={slot.key}
										className="block text-sm font-medium mb-1"
									>
										{slot.label}
									</label>
									<input
										id={slot.key}
										type="number"
										value={itemInputs[slot.key] || ""}
										onChange={(e) => handleItemChange(slot.key, e.target.value)}
										placeholder="Item ID"
										className="w-full px-3 py-1 bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
							))}
						</div>
					</div>
				</div>

				<div className="bg-gray-800 p-6 rounded-lg">
					<h2 className="text-2xl font-semibold mb-4">Model Preview</h2>
					<div className="flex justify-center">
						{scriptLoaded ? (
							<WowModelViewerFixed
								race={race}
								gender={gender}
								items={items}
								width={500}
								height={700}
								className="bg-gray-700 rounded-lg"
							/>
						) : (
							<div className="flex items-center justify-center h-[700px] text-gray-400">
								Loading model viewer scripts...
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
