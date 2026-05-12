"use client";

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import type { Library } from '@googlemaps/js-api-loader';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const libraries: Library[] = ['places', 'geometry'];

interface MapsContextType {
  isLoaded: boolean;
}

const MapsContext = createContext<MapsContextType>({ isLoaded: false });

export function MapsProvider({ children }: { children: ReactNode }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  return (
    <MapsContext.Provider value={{ isLoaded }}>
      {children}
    </MapsContext.Provider>
  );
}

export function useMaps() {
  return useContext(MapsContext);
}
