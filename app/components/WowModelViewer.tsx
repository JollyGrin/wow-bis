import { useEffect, useRef } from "react";
import "wow-model-viewer";

declare global {
	interface Window {
		generateModels: (models: ModelConfig[]) => void;
	}
}

interface ItemSlots {
	head?: number;
	neck?: number;
	shoulder?: number;
	shirt?: number;
	chest?: number;
	waist?: number;
	legs?: number;
	feet?: number;
	wrists?: number;
	hands?: number;
	finger1?: number;
	finger2?: number;
	trinket1?: number;
	trinket2?: number;
	back?: number;
	mainHand?: number;
	offHand?: number;
	ranged?: number;
	tabard?: number;
}

interface ModelConfig {
	type: string;
	id: string;
	contentPath: string;
	model: {
		race: number;
		gender: number;
		items: ItemSlots;
	};
}

interface WowModelViewerProps {
	race: number;
	gender: number;
	items: ItemSlots;
	width?: number;
	height?: number;
	className?: string;
}

export default function WowModelViewer({
	race,
	gender,
	items,
	width = 600,
	height = 800,
	className = "",
}: WowModelViewerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const modelId = useRef(`model-${Date.now()}-${Math.random()}`);

	useEffect(() => {
		if (!containerRef.current || !window.generateModels) {
			console.error("WowModelViewer: Unable to initialize model viewer");
			return;
		}

		// Clear previous model
		containerRef.current.innerHTML = "";

		// Create container div with unique ID
		const modelDiv = document.createElement("div");
		modelDiv.id = modelId.current;
		modelDiv.style.width = "100%";
		modelDiv.style.height = "100%";
		containerRef.current.appendChild(modelDiv);

		// Generate the model
		try {
			window.generateModels([
				{
					type: "character",
					id: modelId.current,
					contentPath: "",
					model: {
						race,
						gender,
						items,
					},
				},
			]);
		} catch (error) {
			console.error("WowModelViewer: Failed to generate model", error);
		}

		// Cleanup function
		return () => {
			if (containerRef.current) {
				containerRef.current.innerHTML = "";
			}
		};
	}, [race, gender, items]);

	return (
		<div
			ref={containerRef}
			className={`wow-model-viewer ${className}`}
			style={{ width, height }}
		/>
	);
}
