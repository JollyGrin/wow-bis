"use client";

import { useState } from "react";
import Script from "next/script";
import WowModelViewerFixed from "../components/WowModelViewerFixed";

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

// Sample items for demo
const SAMPLE_ITEMS = {
	head: 18817, // Crown of Destruction
	chest: 16905, // Bloodfang Chestpiece
	mainHand: 19019, // Thunderfury
	shoulder: 16544, // Warlord's Plate Shoulders
	legs: 16962, // Legplates of Wrath
	feet: 16965, // Sabatons of Wrath
	hands: 16964, // Gauntlets of Wrath
	waist: 16960, // Waistband of Wrath
	wrists: 16959, // Bracelets of Wrath
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
				src="https://code.jquery.com/jquery-3.6.0.min.js"
				strategy="beforeInteractive"
			/>
			<Script 
				src="/api/wowhead-proxy/modelviewer/live/viewer/viewer.min.js"
				strategy="afterInteractive"
				onLoad={() => setScriptLoaded(true)}
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
