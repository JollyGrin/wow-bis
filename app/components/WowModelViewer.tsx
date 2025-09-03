import { useEffect, useRef, useState } from "react";

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
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		setIsLoading(true);
		setError(null);

		// Set the content path to use our proxy
		(window as any).CONTENT_PATH = "/api/modelviewer/";

		// Clear previous content
		containerRef.current.innerHTML = "";

		// Dynamically import and use the model viewer
		import("wow-model-viewer")
			.then(async ({ generateModels }) => {
				if (!containerRef.current) return;

				try {
					// Create the model viewer
					const viewer = await generateModels(
						1.0, // aspect ratio
						`#${containerRef.current.id}`, // selector
						{
							race,
							gender,
							...items,
						},
						"classic", // environment
					);
					setIsLoading(false);
				} catch (err) {
					console.error("Failed to create model viewer:", err);
					setError("Failed to load model");
					setIsLoading(false);
				}
			})
			.catch((err) => {
				console.error("Failed to import wow-model-viewer:", err);
				setError("Failed to load model viewer library");
				setIsLoading(false);
			});

		// Cleanup
		return () => {
			if (containerRef.current) {
				containerRef.current.innerHTML = "";
			}
		};
	}, [race, gender, items]);

	// Generate a unique ID for this instance
	const containerId = useRef(
		`model-viewer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
	);

	return (
		<div
			className={`wow-model-viewer ${className}`}
			style={{ width, height, position: "relative" }}
		>
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-400">
					Loading model...
				</div>
			)}
			{error && (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-red-400">
					{error}
				</div>
			)}
			<div
				id={containerId.current}
				ref={containerRef}
				style={{ width: "100%", height: "100%" }}
			/>
		</div>
	);
}
