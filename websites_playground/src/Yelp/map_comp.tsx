import React, { useEffect, useRef } from "react";
import L, { Map as LeafletMap } from "leaflet";

// Fix default marker icon paths for bundlers (Vite/Cra/Next)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
	iconUrl: markerIcon,
	iconRetinaUrl: markerIcon2x,
	shadowUrl: markerShadow,
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	tooltipAnchor: [16, -28],
	shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type Pin = {
	lat: number;
	lng: number;
	popup?: string;
};

type Props = {
	center: [number, number];
	zoom?: number;
	pins?: Pin[];
	className?: string; // e.g., "h-96 rounded-2xl shadow-lg"
};

const Map: React.FC<Props> = ({ center, zoom = 13, pins = [], className }) => {
	const mapRef = useRef<HTMLDivElement | null>(null);
	const mapInstance = useRef<LeafletMap | null>(null);

	useEffect(() => {
		if (!mapRef.current || mapInstance.current) return;

		// Create map
		const map = L.map(mapRef.current).setView(center, zoom);
		mapInstance.current = map;

		// OSM tiles
		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: "© OpenStreetMap contributors",
			maxZoom: 19,
		}).addTo(map);

		// Add pins
		pins.forEach((p) => {
			const m = L.marker([p.lat, p.lng]).addTo(map);
			if (p.popup) m.bindPopup(p.popup);
		});

		return () => {
			map.remove();
			mapInstance.current = null;
		};
	}, []); // create once

	// Update when center/zoom change
	useEffect(() => {
		if (mapInstance.current) {
			mapInstance.current.setView(center, zoom);
		}
	}, [center, zoom]);

	// Update markers when pins change
	useEffect(() => {
		if (!mapInstance.current) return;

		// Simple: clear and re-add pins
		// (For many markers, manage a LayerGroup instead.)
		mapInstance.current.eachLayer((layer) => {
			// keep tile layer, remove markers
			if ((layer as any).getAttribution) return;
			if (layer instanceof L.Marker) mapInstance.current?.removeLayer(layer);
		});

		pins.forEach((p) => {
			const m = L.marker([p.lat, p.lng]).addTo(mapInstance.current!);
			if (p.popup) m.bindPopup(p.popup);
		});
	}, [pins]);

	return <div ref={mapRef} className={className} />;
};

export default Map;
