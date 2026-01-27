// Type fix wrapper for react-leaflet components
// This resolves React type compatibility issues between different @types/react versions

import { MapContainer as LeafletMapContainer, TileLayer as LeafletTileLayer, Marker as LeafletMarker, Popup as LeafletPopup, Circle as LeafletCircle } from 'react-leaflet';
import type { MapContainerProps, TileLayerProps, MarkerProps, PopupProps, CircleProps } from 'react-leaflet';

// Re-export with proper typing
export const MapContainer = LeafletMapContainer as React.FC<MapContainerProps & { children?: React.ReactNode }>;
export const TileLayer = LeafletTileLayer as React.FC<TileLayerProps>;
export const Marker = LeafletMarker as React.FC<MarkerProps & { children?: React.ReactNode }>;
export const Popup = LeafletPopup as React.FC<PopupProps & { children?: React.ReactNode }>;
export const Circle = LeafletCircle as React.FC<CircleProps>;

export { useMap } from 'react-leaflet';
