/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { IrrigationScheme, Language } from '../../types';
import {
  MapPin,
  Layers,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Plus,
  Edit2,
  Trash2,
  Globe,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react';
import { SchemeEditModal } from './SchemeEditModal';

interface Props {
  schemes: IrrigationScheme[];
  lang: Language;
  onUpdateSchemes?: (schemes: IrrigationScheme[]) => void;
  isAdmin?: boolean;
}

type MapLayerTheme = 'status' | 'water' | 'coverage' | 'problems';
type BaseMapType = 'google_earth' | 'google_map' | 'google_terrain' | 'osm';

export const OromiaGisMap: React.FC<Props> = ({
  schemes,
  lang,
  onUpdateSchemes,
  isAdmin = true, // enabled for admin manipulation
}) => {
  const isOromo = lang === 'om';
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeTheme, setActiveTheme] = useState<MapLayerTheme>('status');
  const [baseMap, setBaseMap] = useState<BaseMapType>('google_earth');
  const [selectedScheme, setSelectedScheme] = useState<IrrigationScheme | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'functional' | 'partly_functional' | 'non_functional'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Scheme Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalScheme, setModalScheme] = useState<IrrigationScheme | null>(null);
  const [presetCoords, setPresetCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Filter schemes
  const filteredSchemes = useMemo(() => {
    return schemes.filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.woreda.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.zoneName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [schemes, searchTerm, statusFilter]);

  // Color logic for markers
  const getMarkerColor = (scheme: IrrigationScheme): string => {
    if (activeTheme === 'status') {
      if (scheme.status === 'functional') return '#10b981'; // Green
      if (scheme.status === 'partly_functional') return '#f59e0b'; // Amber
      return '#ef4444'; // Red
    }
    if (activeTheme === 'water') {
      if (scheme.waterAvailability === 'adequate') return '#0ea5e9'; // Blue
      if (scheme.waterAvailability === 'limited') return '#f97316'; // Orange
      return '#dc2626'; // Red
    }
    if (activeTheme === 'coverage') {
      return '#d97706'; // Amber graduated
    }
    if (activeTheme === 'problems') {
      if (scheme.operationalProblem === 'None') return '#10b981';
      if (scheme.operationalProblem === 'Pump breakdown') return '#f43f5e';
      if (scheme.operationalProblem === 'Canal damage' || scheme.operationalProblem === 'Siltation') return '#8b5cf6';
      if (scheme.operationalProblem === 'Water shortage') return '#f59e0b';
      return '#64748b';
    }
    return '#10b981';
  };

  const getMarkerRadius = (scheme: IrrigationScheme): number => {
    if (activeTheme === 'coverage') {
      return Math.max(8, Math.min(22, (scheme.actualIrrigatedWheatHa / 15000) * 16 + 7));
    }
    return 10;
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center on Oromia, Ethiopia (~8.2°N, 39.2°E)
      const map = L.map(mapContainerRef.current, {
        center: [8.2, 39.2],
        zoom: 7,
        zoomControl: true,
        attributionControl: false,
      });

      // Click to add scheme at coordinates
      map.on('click', (e: L.LeafletMouseEvent) => {
        setPresetCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Switch BaseMap Layer (Google Earth Satellite, Google Maps, Google Terrain, OSM)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let tileUrl = '';
    let maxZoom = 20;

    switch (baseMap) {
      case 'google_earth':
        // Google Hybrid Satellite imagery with road/place overlays (Google Earth)
        tileUrl = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
        break;
      case 'google_map':
        // Google Roadmap Standard
        tileUrl = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
        break;
      case 'google_terrain':
        // Google Terrain / Topographic relief
        tileUrl = 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
        break;
      case 'osm':
      default:
        tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        maxZoom = 19;
        break;
    }

    const newLayer = L.tileLayer(tileUrl, {
      maxZoom,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    });

    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
  }, [baseMap]);

  // 3. Render Markers when schemes, filters, or theme change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    filteredSchemes.forEach(scheme => {
      if (isNaN(scheme.lat) || isNaN(scheme.lng)) return;

      const color = getMarkerColor(scheme);
      const radius = getMarkerRadius(scheme);

      const circle = L.circleMarker([scheme.lat, scheme.lng], {
        radius,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 0.95,
        fillOpacity: 0.85,
      });

      // Tooltip on hover
      circle.bindTooltip(
        `<strong>${scheme.name}</strong><br/>${scheme.zoneName} · ${scheme.woreda}<br/>${scheme.actualIrrigatedWheatHa.toLocaleString()} ha wheat`,
        { direction: 'top', offset: [0, -8] }
      );

      // Interactive popup
      const statusText = scheme.status === 'functional'
        ? '🟢 Functional'
        : scheme.status === 'partly_functional'
        ? '🟡 Partly Functional'
        : '🔴 Non-functional';

      const popupContent = document.createElement('div');
      popupContent.className = 'text-xs p-1 space-y-1.5 min-w-[210px] text-slate-800';
      popupContent.innerHTML = `
        <div class="font-bold text-sm text-slate-900 border-b pb-1 flex items-center justify-between">
          <span>${scheme.name}</span>
          <span class="text-[10px] font-mono font-normal text-slate-500">${scheme.id}</span>
        </div>
        <div class="space-y-0.5 text-[11px]">
          <div><strong>${isOromo ? 'Godina' : 'Zone'}:</strong> ${scheme.zoneName} (${scheme.woreda})</div>
          <div><strong>${isOromo ? 'Haala' : 'Status'}:</strong> ${statusText}</div>
          <div><strong>${isOromo ? 'Lafa Qamadii' : 'Irrigated Wheat'}:</strong> ${scheme.actualIrrigatedWheatHa.toLocaleString()} ha / ${scheme.commandAreaHa.toLocaleString()} ha</div>
          <div><strong>${isOromo ? 'Bishaan' : 'Water'}:</strong> ${scheme.waterAvailability} (${scheme.waterSource})</div>
          <div><strong>${isOromo ? 'Paampota' : 'Pumps'}:</strong> ${scheme.pumpsFunctional} / ${scheme.pumpsTotal} functional</div>
          <div><strong>${isOromo ? 'Fayyadamaa' : 'Beneficiaries'}:</strong> ${scheme.beneficiariesCount.toLocaleString()} households</div>
          ${scheme.operationalProblem !== 'None' ? `<div class="text-rose-600 font-semibold">⚠️ ${scheme.operationalProblem}</div>` : ''}
        </div>
        <div class="pt-1.5 border-t flex items-center justify-between gap-1 text-[10px]">
          <a href="https://www.google.com/maps/search/?api=1&query=${scheme.lat},${scheme.lng}" target="_blank" rel="noopener noreferrer" class="text-blue-600 font-semibold hover:underline">
            Google Maps ↗
          </a>
          <button id="btn-edit-${scheme.id}" class="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 cursor-pointer">
            ${isOromo ? 'Fooyyessi' : 'Edit Scheme'}
          </button>
        </div>
      `;

      circle.bindPopup(popupContent);

      circle.on('popupopen', () => {
        setSelectedScheme(scheme);
        const editBtn = document.getElementById(`btn-edit-${scheme.id}`);
        if (editBtn) {
          editBtn.onclick = (e) => {
            e.stopPropagation();
            mapInstanceRef.current?.closePopup();
            setModalScheme(scheme);
            setIsModalOpen(true);
          };
        }
      });

      markersLayer.addLayer(circle);
    });
  }, [filteredSchemes, activeTheme, isOromo]);

  // Handle Save Scheme (Add or Edit)
  const handleSaveScheme = (saved: IrrigationScheme) => {
    let updatedList: IrrigationScheme[] = [];
    const exists = schemes.some(s => s.id === saved.id);

    if (exists) {
      updatedList = schemes.map(s => (s.id === saved.id ? saved : s));
    } else {
      updatedList = [saved, ...schemes];
    }

    onUpdateSchemes?.(updatedList);
    setSelectedScheme(saved);

    // Pan map to updated scheme
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([saved.lat, saved.lng], 10, { animate: true });
    }
  };

  // Handle Delete Scheme
  const handleDeleteScheme = (schemeId: string) => {
    const updatedList = schemes.filter(s => s.id !== schemeId);
    onUpdateSchemes?.(updatedList);
    if (selectedScheme?.id === schemeId) {
      setSelectedScheme(null);
    }
  };

  // Reset Map View to Oromia Center
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([8.2, 39.2], 7, { animate: true });
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none p-6 bg-slate-950 text-white overflow-y-auto' : ''
    }`}>
      {/* Top Header & GIS Navigation Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {isOromo ? 'Kaartaa GIS Iskimiilee Jallisii Oromiyaa' : 'Oromia Irrigation Schemes GIS Map'}
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-mono font-normal">
                  {schemes.length} {isOromo ? 'Iskimiilee' : 'Schemes'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {isOromo
                  ? 'Kaartaa satellite Google Earth & Google Map irratti hundaa\'ee ragaa qabatamaa'
                  : 'Interactive satellite imagery powered by Google Earth & Google Maps layers with live scheme management'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* BaseMap Selector: Google Earth / Google Map / Google Terrain */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setBaseMap('google_earth')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                baseMap === 'google_earth'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
              title="Google Earth high-resolution satellite imagery"
            >
              <span>🛰️ Google Earth</span>
            </button>
            <button
              onClick={() => setBaseMap('google_map')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                baseMap === 'google_map'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
              title="Google Maps standard roadmap cartography"
            >
              <span>🗺️ Google Map</span>
            </button>
            <button
              onClick={() => setBaseMap('google_terrain')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                baseMap === 'google_terrain'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
              title="Google Terrain topography and elevation relief"
            >
              <span>⛰️ Terrain</span>
            </button>
          </div>

          {/* Admin Add Scheme Button */}
          {isAdmin && (
            <button
              onClick={() => {
                setModalScheme(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isOromo ? 'Iskimi Haaraa Galchi' : 'Add New Scheme'}</span>
            </button>
          )}

          {/* Reset Zoom */}
          <button
            onClick={handleResetView}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Reset to Oromia Regional View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Layer Themes & Filtering Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
        {/* Layer Theme Buttons */}
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500 mr-1" />
          <span className="font-semibold text-slate-600 dark:text-slate-400 mr-1">
            {isOromo ? 'Teemaa:' : 'Theme:'}
          </span>
          <button
            onClick={() => setActiveTheme('status')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              activeTheme === 'status'
                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            {isOromo ? 'Haala Hojii (Status)' : 'Scheme Status'}
          </button>
          <button
            onClick={() => setActiveTheme('water')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              activeTheme === 'water'
                ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            {isOromo ? 'Bishaan (Water)' : 'Water Availability'}
          </button>
          <button
            onClick={() => setActiveTheme('coverage')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              activeTheme === 'coverage'
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            {isOromo ? 'Lafa Qamadii (Area)' : 'Wheat Area Sown'}
          </button>
          <button
            onClick={() => setActiveTheme('problems')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              activeTheme === 'problems'
                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            {isOromo ? 'Rakkoolee (Problems)' : 'Operational Problems'}
          </button>
        </div>

        {/* Filter and Search */}
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Filter className="w-3 h-3 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">{isOromo ? 'Haala Hunda' : 'All Status'}</option>
              <option value="functional">🟢 Functional</option>
              <option value="partly_functional">🟡 Partly Functional</option>
              <option value="non_functional">🔴 Non-functional</option>
            </select>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={isOromo ? 'Barbaadi...' : 'Search scheme, woreda...'}
              className="pl-8 pr-3 py-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
            />
          </div>
        </div>
      </div>

      {/* Map Viewport Canvas */}
      <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
        {/* Leaflet Slippy Map DOM Container */}
        <div
          ref={mapContainerRef}
          className="w-full bg-slate-950"
          style={{ height: isFullscreen ? 'calc(100vh - 220px)' : '580px', minHeight: '400px' }}
        />

        {/* Live Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-lg text-xs space-y-2 pointer-events-auto max-w-[260px]">
          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between border-b pb-1">
            <span>{isOromo ? 'Ibsa Kaartaa' : 'GIS Legend'}</span>
            <span className="text-[10px] text-slate-400">
              {baseMap === 'google_earth' ? 'Google Earth' : baseMap === 'google_map' ? 'Google Maps' : 'Terrain'}
            </span>
          </div>

          {activeTheme === 'status' && (
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shrink-0" />
                <span>Functional (Hojjetaa Jira)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 border border-white shrink-0" />
                <span>Partly Functional (Gartokkeen)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 border border-white shrink-0" />
                <span>Non-functional (Hojii Dhaabe)</span>
              </div>
            </div>
          )}

          {activeTheme === 'water' && (
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-500 border border-white shrink-0" />
                <span>Adequate (Bishaan Gahaa)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 border border-white shrink-0" />
                <span>Limited (Muraasa Qofa)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-600 border border-white shrink-0" />
                <span>Unavailable (Hin Jiru)</span>
              </div>
            </div>
          )}

          {activeTheme === 'coverage' && (
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/80 border border-white shrink-0 flex items-center justify-center text-[9px] text-white font-bold">L</span>
                <span>&gt; 10,000 ha (Large Scheme)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500/80 border border-white shrink-0" />
                <span>3,000 - 10,000 ha (Medium)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-white shrink-0" />
                <span>&lt; 3,000 ha (Small / Community)</span>
              </div>
            </div>
          )}

          {activeTheme === 'problems' && (
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                <span>None (Rakkoo Hin Qabu)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                <span>Pump Breakdown</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
                <span>Canal Damage / Siltation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                <span>Water Shortage</span>
              </div>
            </div>
          )}

          {presetCoords && (
            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-emerald-600 font-mono flex items-center justify-between">
              <span>Clicked GPS: {presetCoords.lat.toFixed(4)}, {presetCoords.lng.toFixed(4)}</span>
              {isAdmin && (
                <button
                  onClick={() => {
                    setModalScheme(null);
                    setIsModalOpen(true);
                  }}
                  className="font-bold underline ml-1 cursor-pointer"
                >
                  + Add Scheme
                </button>
              )}
            </div>
          )}
        </div>

        {/* Selected Scheme Detail Floating Drawer */}
        {selectedScheme && (
          <div className="absolute top-4 right-4 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xl text-xs space-y-3 pointer-events-auto max-w-[320px] w-full">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{selectedScheme.name}</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedScheme.zoneName} · {selectedScheme.woreda} ({selectedScheme.id})
                </p>
              </div>
              <button
                onClick={() => setSelectedScheme(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <div>
                <span className="text-slate-400 block text-[10px]">Command Area:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedScheme.commandAreaHa.toLocaleString()} ha
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Actual Irrigated:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedScheme.actualIrrigatedWheatHa.toLocaleString()} ha
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Water Source:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {selectedScheme.waterSource} ({selectedScheme.waterAvailability})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Pump Status:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {selectedScheme.pumpsFunctional}/{selectedScheme.pumpsTotal} functional
                </span>
              </div>
              <div className="col-span-2 pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Beneficiaries:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {selectedScheme.beneficiariesCount.toLocaleString()} farming households
                </span>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setModalScheme(selectedScheme);
                    setIsModalOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isOromo ? 'Fooyyessi' : 'Edit Scheme'}</span>
                </button>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        isOromo
                          ? `Iskimi "${selectedScheme.name}" haquu barbaaddaa?`
                          : `Delete scheme "${selectedScheme.name}"?`
                      )
                    ) {
                      handleDeleteScheme(selectedScheme.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors"
                  title="Delete Scheme"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scheme Edit/Add Modal */}
      <SchemeEditModal
        scheme={modalScheme}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalScheme(null);
        }}
        onSave={handleSaveScheme}
        onDelete={handleDeleteScheme}
        lang={lang}
        presetCoords={presetCoords}
      />
    </div>
  );
};
