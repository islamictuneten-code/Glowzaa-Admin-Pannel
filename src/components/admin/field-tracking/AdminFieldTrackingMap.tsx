import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { FieldDutySession, GpsLocationPing, CustomerVisit } from '../../../types';
import { MapPin, Navigation, Compass, Layers, ExternalLink } from 'lucide-react';

// Fix default Leaflet icon paths in React Vite
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = defaultIcon;

interface StaffMarkerData {
  session: FieldDutySession;
  staleStatus: 'live' | 'delayed' | 'stale' | 'unavailable';
  minutesAgo: number;
}

interface AdminFieldTrackingMapProps {
  staffList: StaffMarkerData[];
  selectedStaffId?: string | null;
  onSelectStaff?: (staffId: string) => void;
  onOpenRoute?: (session: FieldDutySession) => void;
  onOpenVisits?: (session: FieldDutySession) => void;
  // Route view props
  routePings?: GpsLocationPing[];
  routeVisits?: CustomerVisit[];
  routeSession?: FieldDutySession | null;
  isRouteMode?: boolean;
}

export const AdminFieldTrackingMap: React.FC<AdminFieldTrackingMapProps> = ({
  staffList,
  selectedStaffId,
  onSelectStaff,
  onOpenRoute,
  onOpenVisits,
  routePings = [],
  routeVisits = [],
  routeSession,
  isRouteMode = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map instance once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default to Dhaka, Bangladesh coordinates
      const initialLat = 23.8103;
      const initialLon = 90.4125;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLon],
        zoom: 12,
        zoomControl: true,
        attributionControl: false
      });

      // Add high-resolution OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Attribution control in compact bottom right
      L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      const routeGroup = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = markersGroup;
      routeLayerRef.current = routeGroup;
    }

    return () => {
      // Cleanup map on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update staff markers when staffList changes (Live Monitoring Mode)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer || isRouteMode) return;

    markersLayer.clearLayers();

    const validMarkers: L.LatLngExpression[] = [];

    staffList.forEach((item) => {
      const lat = item.session.lastLatitude;
      const lon = item.session.lastLongitude;

      if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
        const latLng: [number, number] = [lat, lon];
        validMarkers.push(latLng);

        const isSelected = selectedStaffId === item.session.userId;
        const color =
          item.staleStatus === 'live'
            ? '#087F7A'
            : item.staleStatus === 'delayed'
            ? '#D97706'
            : item.staleStatus === 'stale'
            ? '#EA580C'
            : '#64748B';

        const statusLabel =
          item.staleStatus === 'live'
            ? 'LIVE (<= 5m)'
            : item.staleStatus === 'delayed'
            ? 'DELAYED (5-10m)'
            : item.staleStatus === 'stale'
            ? 'STALE (> 10m)'
            : 'NO GPS';

        // Custom HTML Marker with beacon ripple
        const customIcon = L.divIcon({
          className: 'custom-staff-marker',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;">
              ${
                item.staleStatus === 'live'
                  ? `<div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background-color: ${color}; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
                  : ''
              }
              <div style="width: 32px; height: 32px; border-radius: 50%; background-color: ${color}; border: 3px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 11px; z-index: 10;">
                ${item.session.userName ? item.session.userName.slice(0, 2).toUpperCase() : 'ST'}
              </div>
              <div style="position: absolute; bottom: -4px; right: 0; width: 12px; height: 12px; border-radius: 50%; background-color: ${
                item.staleStatus === 'live' ? '#22C55E' : item.staleStatus === 'delayed' ? '#F59E0B' : item.staleStatus === 'stale' ? '#EA580C' : '#94A3B8'
              }; border: 2px solid #ffffff; z-index: 11;"></div>
            </div>
          `,
          iconSize: [42, 42],
          iconAnchor: [21, 21],
          popupAnchor: [0, -22]
        });

        const marker = L.marker(latLng, { icon: customIcon });

        // Popup Content
        const timeAgoText = item.minutesAgo === 0 ? 'Just now' : `${item.minutesAgo}m ago`;
        const accuracyText = item.session.gpsAccuracyMeters ? `±${Math.round(item.session.gpsAccuracyMeters)}m` : 'Unknown';
        const batteryText = item.session.batteryLevel !== null && item.session.batteryLevel !== undefined ? `${item.session.batteryLevel}%` : 'N/A';

        const popupContent = `
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 220px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 8px;">
              <div>
                <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: #102A2A;">${item.session.userName}</h4>
                <span style="font-size: 11px; color: #64748B; font-weight: 600;">${item.session.userLoginId || 'Sales Staff'}</span>
              </div>
              <span style="display: inline-block; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background-color: ${
                item.staleStatus === 'live' ? '#E8F7F5' : '#FEF3C7'
              }; color: ${color};">
                ${statusLabel}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; margin-bottom: 10px;">
              <div style="background: #F8FAFB; padding: 4px 6px; border-radius: 6px; border: 1px solid #E2E8F0;">
                <div style="color: #64748B; font-size: 9px; font-weight: 700; text-transform: uppercase;">GPS Sync</div>
                <div style="font-weight: 700; color: #102A2A;">${timeAgoText}</div>
              </div>
              <div style="background: #F8FAFB; padding: 4px 6px; border-radius: 6px; border: 1px solid #E2E8F0;">
                <div style="color: #64748B; font-size: 9px; font-weight: 700; text-transform: uppercase;">Accuracy</div>
                <div style="font-weight: 700; color: #102A2A;">${accuracyText}</div>
              </div>
              <div style="background: #F8FAFB; padding: 4px 6px; border-radius: 6px; border: 1px solid #E2E8F0;">
                <div style="color: #64748B; font-size: 9px; font-weight: 700; text-transform: uppercase;">Visits Done</div>
                <div style="font-weight: 700; color: #087F7A;">${item.session.totalVisitsCompleted || 0} shops</div>
              </div>
              <div style="background: #F8FAFB; padding: 4px 6px; border-radius: 6px; border: 1px solid #E2E8F0;">
                <div style="color: #64748B; font-size: 9px; font-weight: 700; text-transform: uppercase;">Battery</div>
                <div style="font-weight: 700; color: #102A2A;">🔋 ${batteryText}</div>
              </div>
            </div>

            <div style="display: flex; gap: 6px;">
              <button id="btn-select-${item.session.userId}" style="flex: 1; padding: 6px; font-size: 11px; font-weight: 700; background-color: #087F7A; color: #ffffff; border: none; border-radius: 6px; cursor: pointer;">
                Inspect Staff
              </button>
              <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lon}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; padding: 6px 8px; background-color: #F1F5F9; color: #475569; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: 700;" title="Open in Google Maps">
                ↗ Google Maps
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 280 });

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-select-${item.session.userId}`);
          if (btn && onSelectStaff) {
            btn.onclick = () => onSelectStaff(item.session.userId);
          }
        });

        marker.on('click', () => {
          if (onSelectStaff) onSelectStaff(item.session.userId);
        });

        markersLayer.addLayer(marker);

        if (isSelected) {
          marker.openPopup();
        }
      }
    });

    // Auto-fit bounds if we have valid coordinates and not manually dragging
    if (validMarkers.length > 0) {
      const bounds = L.latLngBounds(validMarkers);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [staffList, selectedStaffId, isRouteMode]);

  // Route Reconstruction Layer (Route Mode)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeLayer = routeLayerRef.current;
    const markersLayer = markersLayerRef.current;

    if (!map || !routeLayer || !markersLayer) return;

    if (!isRouteMode) {
      routeLayer.clearLayers();
      return;
    }

    // Clear live markers when viewing specific route
    markersLayer.clearLayers();
    routeLayer.clearLayers();

    const routeLatLngs: [number, number][] = [];

    // 1. Build Polyline from location pings
    routePings.forEach((ping) => {
      if (
        typeof ping.latitude === 'number' &&
        typeof ping.longitude === 'number' &&
        !isNaN(ping.latitude) &&
        !isNaN(ping.longitude)
      ) {
        routeLatLngs.push([ping.latitude, ping.longitude]);
      }
    });

    if (routeLatLngs.length > 1) {
      // Main route polyline
      const polyline = L.polyline(routeLatLngs, {
        color: '#087F7A',
        weight: 5,
        opacity: 0.85,
        smoothFactor: 1,
        lineCap: 'round',
        lineJoin: 'round'
      });
      routeLayer.addLayer(polyline);

      // Route outline for crisp visibility
      const outlinePolyline = L.polyline(routeLatLngs, {
        color: '#075E5B',
        weight: 7,
        opacity: 0.35,
        smoothFactor: 1,
        lineCap: 'round',
        lineJoin: 'round'
      });
      routeLayer.addLayer(outlinePolyline);
    }

    // 2. Start Location Marker (Green Flag)
    if (routeLatLngs.length > 0) {
      const startPoint = routeLatLngs[0];
      const startIcon = L.divIcon({
        className: 'route-start-marker',
        html: `
          <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #10B981; border: 3px solid #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 13px;">
            🚩
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
      });

      const startMarker = L.marker(startPoint, { icon: startIcon });
      startMarker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px;">
          <h4 style="margin: 0; font-size: 12px; font-weight: 800; color: #10B981;">🚩 ROUTE START POINT</h4>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">
            Duty Started: ${routeSession?.startedAt ? new Date(routeSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
          </p>
        </div>
      `);
      routeLayer.addLayer(startMarker);
    }

    // 3. Current / Latest Location Marker (Blue Target)
    if (routeLatLngs.length > 1) {
      const lastPoint = routeLatLngs[routeLatLngs.length - 1];
      const endIcon = L.divIcon({
        className: 'route-end-marker',
        html: `
          <div style="width: 34px; height: 34px; border-radius: 50%; background-color: #087F7A; border: 3px solid #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 13px;">
            📍
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18]
      });

      const endMarker = L.marker(lastPoint, { icon: endIcon });
      endMarker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px;">
          <h4 style="margin: 0; font-size: 12px; font-weight: 800; color: #087F7A;">📍 LATEST / END POINT</h4>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">
            Last Ping: ${routePings[routePings.length - 1]?.timestamp ? new Date(routePings[routePings.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
          </p>
        </div>
      `);
      routeLayer.addLayer(endMarker);
    }

    // 4. Customer Visit Stop Markers (Store Pins)
    routeVisits.forEach((visit, idx) => {
      const lat = visit.checkInLatitude;
      const lon = visit.checkInLongitude;
      if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
        const visitIcon = L.divIcon({
          className: 'route-visit-marker',
          html: `
            <div style="width: 30px; height: 30px; border-radius: 8px; background-color: #8B5CF6; border: 2px solid #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 11px;">
              🏪 ${idx + 1}
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -16]
        });

        const visitMarker = L.marker([lat, lon], { icon: visitIcon });
        visitMarker.bindPopup(`
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 200px; padding: 4px;">
            <div style="font-size: 10px; font-weight: 800; color: #8B5CF6; text-transform: uppercase;">Stop #${idx + 1} · Shop Visit</div>
            <h4 style="margin: 2px 0; font-size: 13px; font-weight: 800; color: #102A2A;">${visit.shopName || 'Retail Shop'}</h4>
            <div style="font-size: 11px; color: #64748B;">Owner: ${visit.ownerName || 'N/A'}</div>
            <div style="margin-top: 6px; font-size: 11px; background: #F8FAFB; padding: 4px 6px; border-radius: 6px; border: 1px solid #E2E8F0;">
              <div>Check-in: <b>${visit.checkInTime ? new Date(visit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</b></div>
              <div>Duration: <b>${visit.durationMinutes !== null && visit.durationMinutes !== undefined ? `${visit.durationMinutes} mins` : 'Ongoing'}</b></div>
              ${visit.visitOutcome ? `<div>Outcome: <b style="color: #087F7A;">${visit.visitOutcome}</b></div>` : ''}
            </div>
          </div>
        `);
        routeLayer.addLayer(visitMarker);
      }
    });

    // Fit route bounds
    if (routeLatLngs.length > 0) {
      const bounds = L.latLngBounds(routeLatLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [isRouteMode, routePings, routeVisits, routeSession]);

  // Recenter helper
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isRouteMode && routePings.length > 0) {
      const latLngs = routePings
        .filter((p) => typeof p.latitude === 'number' && typeof p.longitude === 'number')
        .map((p) => [p.latitude, p.longitude] as [number, number]);
      if (latLngs.length > 0) {
        map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
      }
    } else {
      const validPoints = staffList
        .filter((s) => typeof s.session.lastLatitude === 'number' && typeof s.session.lastLongitude === 'number')
        .map((s) => [s.session.lastLatitude!, s.session.lastLongitude!] as [number, number]);

      if (validPoints.length > 0) {
        map.fitBounds(L.latLngBounds(validPoints), { padding: [50, 50], maxZoom: 15 });
      } else {
        map.setView([23.8103, 90.4125], 12);
      }
    }
  };

  return (
    <div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] lg:min-h-[520px] rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100 flex flex-col">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full flex-1 z-0" />

      {/* Floating Map Overlay Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        <button
          onClick={handleRecenter}
          className="p-2.5 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 text-slate-700 hover:text-[#087F7A] hover:bg-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          title="Recenter & Fit All Staff Markers"
        >
          <Compass className="w-4 h-4 text-[#087F7A]" />
          <span className="hidden sm:inline">Fit Markers</span>
        </button>
      </div>

      {/* Floating Status Bar */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-lg border border-slate-200 flex items-center justify-between sm:justify-start gap-4 text-xs font-semibold text-slate-700">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-extrabold text-[#102A2A]">Live GPS:</span>
          <span>{staffList.filter((s) => s.staleStatus === 'live').length} Active</span>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-slate-500 border-l border-slate-200 pl-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Stale ({staffList.filter((s) => s.staleStatus === 'stale').length})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Offline ({staffList.filter((s) => s.staleStatus === 'offline').length})</span>
          </div>
        </div>

        {isRouteMode && (
          <div className="flex items-center gap-1.5 text-[#087F7A] font-bold bg-[#E8F7F5] px-2 py-1 rounded-lg">
            <Navigation className="w-3.5 h-3.5" />
            <span>Route Mode: {routePings.length} GPS Pings</span>
          </div>
        )}
      </div>
    </div>
  );
};
