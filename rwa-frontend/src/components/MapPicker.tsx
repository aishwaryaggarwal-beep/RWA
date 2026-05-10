"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default Leaflet icon not showing up in Next.js/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  defaultLat?: number;
  defaultLng?: number;
}

const LocationPickerMarker = ({ onLocationSelect, position, setPosition }: any) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : <Marker position={position}></Marker>;
};

// Component to handle map zooming to new searched coordinates
const MapController = ({ center }: { center: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15);
    }
  }, [center, map]);
  return null;
};

export default function MapPicker({ onLocationSelect, defaultLat = 37.7749, defaultLng = -122.4194 }: MapPickerProps) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusCenter, setFocusCenter] = useState<[number, number] | null>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setSearching(true);
    
    try {
      let finalLat: number | null = null;
      let finalLng: number | null = null;

      const attemptSearch = async (query: string) => {
        try {
          const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=3`);
          const photonData = await photonRes.json();
          if (photonData?.features?.length > 0) {
            finalLng = parseFloat(photonData.features[0].geometry.coordinates[0]);
            finalLat = parseFloat(photonData.features[0].geometry.coordinates[1]);
            return true;
          }
        } catch (err) {}

        if (finalLat === null) {
          try {
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=3`);
            const nomData = await nomRes.json();
            if (nomData && nomData.length > 0) {
              finalLat = parseFloat(nomData[0].lat);
              finalLng = parseFloat(nomData[0].lon);
              return true;
            }
          } catch (err) {}
        }
        return false;
      };

      // 1. Try exact full search
      let success = await attemptSearch(searchQuery);

      // 2. If it fails, try stripping highly specific details (like door numbers or unit numbers)
      if (!success && searchQuery.includes(",")) {
        const parts = searchQuery.split(",");
        for (let i = 1; i < parts.length; i++) {
          const reducedQuery = parts.slice(i).join(",").trim();
          if (reducedQuery.length > 3) {
            success = await attemptSearch(reducedQuery);
            if (success) break;
          }
        }
      }

      // 3. If still fails, try removing the first word (often a street number)
      if (!success) {
        const words = searchQuery.split(" ");
        if (words.length > 2) {
          const reducedQuery = words.slice(1).join(" ").trim();
          success = await attemptSearch(reducedQuery);
        }
      }

      if (finalLat !== null && finalLng !== null) {
        const newPos = new L.LatLng(finalLat, finalLng);
        setFocusCenter([finalLat, finalLng]);
        setPosition(newPos);
        onLocationSelect(finalLat, finalLng);
      } else {
        alert("Exact address not found. The map engines do not recognize this specific building number.\n\nTry searching just the street name, neighborhood, or city, and then drag the pin to the exact location.");
      }

    } catch (err) {
      console.error("Geocoding failed", err);
      alert("Failed to search location. Please check your network.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ height: "350px", width: "100%", borderRadius: "10px", overflow: "hidden", marginTop: "10px", border: "1px solid rgba(255,255,255,0.1)", zIndex: 0, position: "relative", display: "flex", flexDirection: "column" }}>
      
      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ display: "flex", background: "rgba(15, 23, 42, 1)", padding: "10px", zIndex: 1000, position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: "80%", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)"}}>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search with Google Maps (e.g. 1 Infinite Loop, Cupertino)" 
          style={{ flex: 1, padding: "8px 12px", borderRadius: "5px", border: "none", outline: "none", background: "rgba(255,255,255,0.1)", color: "white" }}
        />
        <button type="submit" disabled={searching} style={{ marginLeft: "10px", padding: "8px 15px", borderRadius: "5px", border: "none", background: "#10b981", color: "black", fontWeight: "bold", cursor: searching ? "not-allowed" : "pointer" }}>
          {searching ? "..." : "Find"}
        </button>
      </form>

      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "rgba(15, 23, 42, 0.8)", padding: "5px 15px", borderRadius: "20px", fontSize: "11px", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af", backdropFilter: "blur(5px)" }}>
        You can also click anywhere on the map to micro-adjust the pin
      </div>
      
      <div style={{ flex: 1, zIndex: 0 }}>
        <MapContainer center={[defaultLat, defaultLng]} zoom={3} style={{ height: "100%", width: "100%", zIndex: 0 }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapController center={focusCenter} />
          <LocationPickerMarker position={position} setPosition={setPosition} onLocationSelect={onLocationSelect} />
        </MapContainer>
      </div>

    </div>
  );
}
