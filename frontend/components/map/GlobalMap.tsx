"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { EventListItem } from "@/lib/types";
import { CATEGORY_COLOR } from "@/lib/utils";
import { api } from "@/lib/api";

const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    carto_dark: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://carto.com/attributions">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#08090B" } },
    { id: "carto_dark_layer", type: "raster", source: "carto_dark", paint: { "raster-opacity": 0.9 } },
  ],
};

export interface MapToggles {
  heatmap: boolean;
  populationExposure: boolean;
  riskZones: boolean;
  connections: boolean;
}

function toFeatureCollection(events: EventListItem[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: events.map((e) => ({
      type: "Feature",
      id: e.id,
      geometry: { type: "Point", coordinates: [e.longitude, e.latitude] },
      properties: { ...e },
    })),
  };
}

export function GlobalMap({
  events,
  toggles,
  onSelectEvent,
  center,
  zoom,
  interactiveControls = true,
}: {
  events: EventListItem[];
  toggles: MapToggles;
  onSelectEvent: (id: string) => void;
  center?: [number, number];
  zoom?: number;
  interactiveControls?: boolean;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const hoverPopup = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: DARK_STYLE,
      center: center || [20, 20],
      zoom: zoom ?? 1.6,
      minZoom: 1,
      maxZoom: 12,
      attributionControl: false,
      interactive: interactiveControls,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      map.addSource("events", {
        type: "geojson",
        data: toFeatureCollection([]),
        cluster: true,
        clusterMaxZoom: 6,
        clusterRadius: 45,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "events",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#11151A",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#3B4250",
          "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 24],
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "events",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Regular"],
          "text-size": 11,
        },
        paint: { "text-color": "#C9CFD8" },
      });

      map.addLayer({
        id: "risk-zones",
        type: "circle",
        source: "events",
        filter: ["all", ["!", ["has", "point_count"]], [">=", ["get", "risk_score"], 61]],
        paint: {
          "circle-color": categoryColorExpr(),
          "circle-opacity": 0.08,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 8, 8, 60],
        },
        layout: { visibility: "none" },
      });

      map.addLayer({
        id: "event-points",
        type: "circle",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": categoryColorExpr(),
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.35)",
          "circle-radius": ["interpolate", ["linear"], ["get", "risk_score"], 0, 3, 50, 6, 100, 11],
          "circle-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "event-critical-halo",
        type: "circle",
        source: "events",
        filter: ["all", ["!", ["has", "point_count"]], [">=", ["get", "risk_score"], 81]],
        paint: {
          "circle-color": categoryColorExpr(),
          "circle-radius": 14,
          "circle-opacity": 0.25,
        },
      });

      map.addLayer(
        {
          id: "event-heat",
          type: "heatmap",
          source: "events",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "risk_score"], 0, 0, 100, 1],
            "heatmap-intensity": 1.1,
            "heatmap-radius": 28,
            "heatmap-opacity": 0.75,
            "heatmap-color": [
              "interpolate", ["linear"], ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.2, "#1d4ed8",
              0.4, "#7c3aed",
              0.6, "#db2777",
              0.8, "#f97316",
              1, "#ef4444",
            ],
          },
          layout: { visibility: "none" },
        },
        "clusters"
      );

      map.addSource("connections", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "connection-lines",
        type: "line",
        source: "connections",
        paint: { "line-color": "#8A93A3", "line-width": 1, "line-opacity": 0.5, "line-dasharray": [2, 2] },
        layout: { visibility: "none" },
      });

      map.on("click", "event-points", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) onSelectEvent(id);
      });
      map.on("click", "clusters", (e) => {
        const feature = e.features?.[0];
        const clusterId = feature?.properties?.cluster_id;
        const source = map.getSource("events") as GeoJSONSource;
        if (clusterId === undefined) return;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({ center: (feature!.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
        });
      });

      ["event-points", "clusters"].forEach((layer) => {
        map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      });

      map.on("mousemove", "event-points", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as any;
        if (!hoverPopup.current) {
          hoverPopup.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
        }
        hoverPopup.current
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(
            `<div style="min-width:160px"><div style="font-weight:600;margin-bottom:2px">${escapeHtml(props.title)}</div><div style="color:#8A93A3">${escapeHtml(props.country)} · risk ${props.risk_score}</div></div>`
          )
          .addTo(map);
      });
      map.on("mouseleave", "event-points", () => hoverPopup.current?.remove());

      mapRef.current = map;
      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("events") as GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(events));

    if (map.getLayer("event-points")) {
      const radiusExpr = toggles.populationExposure
        ? ["interpolate", ["linear"], ["get", "population_exposure"], 0, 3, 100, 12]
        : ["interpolate", ["linear"], ["get", "risk_score"], 0, 3, 50, 6, 100, 11];
      map.setPaintProperty("event-points", "circle-radius", radiusExpr as any);
    }
  }, [events, ready, toggles.populationExposure]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const vis = (v: boolean) => (v ? "visible" : "none");
    if (map.getLayer("event-heat")) map.setLayoutProperty("event-heat", "visibility", vis(toggles.heatmap));
    if (map.getLayer("risk-zones")) map.setLayoutProperty("risk-zones", "visibility", vis(toggles.riskZones));
  }, [toggles.heatmap, toggles.riskZones, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (map.getLayer("connection-lines")) {
      map.setLayoutProperty("connection-lines", "visibility", toggles.connections ? "visible" : "none");
    }
    if (!toggles.connections) return;

    let cancelled = false;
    (async () => {
      const critical = [...events].sort((a, b) => b.risk_score - a.risk_score).slice(0, 12);
      const byId = new Map(events.map((e) => [e.id, e]));
      const features: GeoJSON.Feature[] = [];
      for (const ev of critical) {
        try {
          const rels = await api.eventRelationships(ev.id);
          for (const rel of rels.slice(0, 4)) {
            const otherId = rel.source_event_id === ev.id ? rel.target_event_id : rel.source_event_id;
            const other = byId.get(otherId);
            if (!other) continue;
            features.push({
              type: "Feature",
              properties: { strength: rel.strength },
              geometry: { type: "LineString", coordinates: [[ev.longitude, ev.latitude], [other.longitude, other.latitude]] },
            });
          }
        } catch {
          // best-effort — skip on failure
        }
      }
      if (!cancelled) {
        const src = map.getSource("connections") as GeoJSONSource | undefined;
        src?.setData({ type: "FeatureCollection", features });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [toggles.connections, events, ready]);

  return <div ref={mapContainer} className="h-full w-full" />;
}

function categoryColorExpr(): maplibregl.DataDrivenPropertyValueSpecification<string> {
  const expr = ["match", ["get", "event_category"], ...Object.entries(CATEGORY_COLOR).flatMap(([k, v]) => [k, v]), "#6B7280"];
  return expr as unknown as maplibregl.DataDrivenPropertyValueSpecification<string>;
}

function escapeHtml(str: string): string {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}
