import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { MapLibreOverlay } from '@deck.gl/maplibre'
import { PathLayer, PolygonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import type { Entity, Forecast, Scene, ViewMode } from './types'

const localStyle: maplibregl.StyleSpecification = {
  version: 8,
  name: 'Synthetic sector',
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#0d1824' } }],
}
const onlineStyle = 'https://tiles.openfreemap.org/styles/dark'
maplibregl.setWorkerUrl(mapWorkerUrl)

function addCityBuildings(instance: maplibregl.Map) {
  if (!instance.getSource('openfreemap-buildings')) {
    instance.addSource('openfreemap-buildings', { type: 'vector', url: 'https://tiles.openfreemap.org/planet' })
  }
  if (!instance.getLayer('city-buildings')) {
    instance.addLayer({
      id: 'city-buildings', type: 'fill-extrusion', source: 'openfreemap-buildings',
      'source-layer': 'building', minzoom: 15,
      filter: ['!=', ['get', 'hide_3d'], true],
      paint: {
        'fill-extrusion-color': '#679aa6',
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 0],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.66,
      },
    })
  }
}

function silhouette(entity: Entity): [number, number][] {
  const { longitudeDeg: x, latitudeDeg: y } = entity.position
  const shape = entity.kind === 'fixed_wing'
    ? [[0, 1], [.22, .15], [.9, -.16], [.88, -.36], [.12, -.22], [.18, -.72], [0, -.62], [-.18, -.72], [-.12, -.22], [-.88, -.36], [-.9, -.16], [-.22, .15]]
    : entity.kind === 'ground_vehicle'
      ? [[-.55, .8], [.55, .8], [.65, -.75], [-.65, -.75]]
      : entity.kind === 'facility'
        ? [[-.7, .7], [.7, .7], [.7, -.7], [-.7, -.7]]
        : [[0, 1], [.24, .25], [.85, 0], [.24, -.25], [0, -1], [-.24, -.25], [-.85, 0], [-.24, .25]]
  const rad = entity.headingDeg * Math.PI / 180
  const scale = entity.kind === 'facility' ? .018 : .026
  return shape.map(([px, py]) => [x + (px * Math.cos(rad) + py * Math.sin(rad)) * scale, y + (py * Math.cos(rad) - px * Math.sin(rad)) * scale]) as [number, number][]
}

type Props = {
  scene: Scene | null; selectedId: string | null; selectedServiceId: string;
  showDependencies: boolean; showRoutes: boolean; showAreas: boolean; showCounties: boolean; showWeather: boolean;
  basemapMode: 'online' | 'local'; viewMode: ViewMode; forecasts: Forecast[];
  focus?: { point: [number, number]; zoom: number; key: number } | null;
  onBasemapFailure: () => void; onSelect: (id: string) => void; onSelectWeather: (key: string) => void;
}

export function MapScene({ scene, selectedId, selectedServiceId, showDependencies, showRoutes, showAreas, showCounties, showWeather, basemapMode, viewMode, forecasts, focus, onBasemapFailure, onSelect, onSelectWeather }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const overlay = useRef<MapLibreOverlay | null>(null)
  const onSelectRef = useRef(onSelect)
  const basemapModeRef = useRef(basemapMode)
  const fallbackRef = useRef(onBasemapFailure)
  const previousSelection = useRef(selectedId)
  const lastBasemapMode = useRef(basemapMode)
  const showCountiesRef = useRef(showCounties)
  const viewModeRef = useRef(viewMode)
  const onSelectWeatherRef = useRef(onSelectWeather)
  onSelectRef.current = onSelect
  basemapModeRef.current = basemapMode
  fallbackRef.current = onBasemapFailure
  showCountiesRef.current = showCounties
  viewModeRef.current = viewMode
  onSelectWeatherRef.current = onSelectWeather

  useEffect(() => {
    if (!container.current) return
    const instance = new maplibregl.Map({ container: container.current, style: basemapModeRef.current === 'online' ? onlineStyle : localStyle, center: [17.28, 59.27], zoom: 8.8 })
    map.current = instance
    instance.on('error', () => { if (basemapModeRef.current === 'online') fallbackRef.current() })
    instance.on('style.load', () => {
      instance.setProjection({ type: viewModeRef.current === 'globe' ? 'globe' : 'mercator' })
      if (!instance.getSource('scb-counties')) {
        instance.addSource('scb-counties', { type: 'geojson', data: '/data/sweden_counties.geojson' })
        instance.addLayer({ id: 'county-fill', type: 'fill', source: 'scb-counties', paint: { 'fill-color': '#84b4c8', 'fill-opacity': 0.025 } })
        instance.addLayer({ id: 'county-line', type: 'line', source: 'scb-counties', paint: { 'line-color': '#a2c7d7', 'line-opacity': 0.72, 'line-width': 1.4 } })
      }
      const visibility = showCountiesRef.current ? 'visible' : 'none'
      instance.setLayoutProperty('county-fill', 'visibility', visibility)
      instance.setLayoutProperty('county-line', 'visibility', visibility)
      if (viewModeRef.current === 'terrain' && basemapModeRef.current === 'online') {
        if (!instance.getSource('mapterhorn-dem')) instance.addSource('mapterhorn-dem', { type: 'raster-dem', url: 'https://tiles.mapterhorn.com/tilejson.json' })
        instance.setTerrain({ source: 'mapterhorn-dem', exaggeration: 1.4 })
        if (!instance.getLayer('terrain-shade')) instance.addLayer({ id: 'terrain-shade', type: 'hillshade', source: 'mapterhorn-dem', paint: { 'hillshade-shadow-color': '#0a1821', 'hillshade-highlight-color': '#d0dedf', 'hillshade-exaggeration': 0.25 } })
      }
      if (viewModeRef.current === 'city' && basemapModeRef.current === 'online') addCityBuildings(instance)
    })
    const deck = new MapLibreOverlay({ interleaved: false, layers: [] })
    overlay.current = deck
    instance.addControl(deck)
    instance.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')
    return () => { instance.remove(); map.current = null; overlay.current = null }
  }, [])

  useEffect(() => {
    if (map.current && lastBasemapMode.current !== basemapMode) map.current.setStyle(basemapMode === 'online' ? onlineStyle : localStyle)
    lastBasemapMode.current = basemapMode
  }, [basemapMode])

  useEffect(() => {
    const instance = map.current
    if (!instance || !instance.isStyleLoaded()) return
    instance.setProjection({ type: viewMode === 'globe' ? 'globe' : 'mercator' })
    if (viewMode !== 'terrain' && instance.getTerrain()) instance.setTerrain(null)
    if (viewMode !== 'terrain' && instance.getLayer('terrain-shade')) instance.removeLayer('terrain-shade')
    if (instance.getLayer('city-buildings')) instance.setLayoutProperty('city-buildings', 'visibility', viewMode === 'city' ? 'visible' : 'none')
    if (viewMode === 'city' && basemapMode === 'online') addCityBuildings(instance)
    if (viewMode === 'terrain' && basemapMode === 'online' && instance.isStyleLoaded()) {
      if (!instance.getSource('mapterhorn-dem')) instance.addSource('mapterhorn-dem', { type: 'raster-dem', url: 'https://tiles.mapterhorn.com/tilejson.json' })
      instance.setTerrain({ source: 'mapterhorn-dem', exaggeration: 1.4 })
      if (!instance.getLayer('terrain-shade')) instance.addLayer({ id: 'terrain-shade', type: 'hillshade', source: 'mapterhorn-dem' })
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    instance.easeTo(viewMode === 'terrain' ? { pitch: 68, bearing: -28, zoom: Math.max(instance.getZoom(), 9.4), duration: reduced ? 0 : 900 } : viewMode === 'city' ? { center: [18.063, 59.332], pitch: 62, bearing: -25, zoom: 16.2, duration: reduced ? 0 : 1100 } : viewMode === 'globe' ? { center: [17, 63], pitch: 0, bearing: 0, zoom: 3, duration: reduced ? 0 : 900 } : { pitch: 0, bearing: 0, zoom: Math.max(instance.getZoom(), 8.7), duration: reduced ? 0 : 700 })
  }, [viewMode, basemapMode])

  useEffect(() => {
    if (map.current?.getLayer('county-line')) {
      const visibility = showCounties ? 'visible' : 'none'
      map.current.setLayoutProperty('county-fill', 'visibility', visibility)
      map.current.setLayoutProperty('county-line', 'visibility', visibility)
    }
  }, [showCounties])

  useEffect(() => {
    if (focus && map.current) map.current.flyTo({ center: focus.point, zoom: focus.zoom, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1000 })
  }, [focus])

  useEffect(() => {
    if (selectedId === previousSelection.current) return
    previousSelection.current = selectedId
    const selected = scene?.entities.find(entity => entity.id === selectedId)
    if (selected && map.current) map.current.flyTo({ center: [selected.position.longitudeDeg, selected.position.latitudeDeg], zoom: Math.max(map.current.getZoom(), 10), duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700 })
  }, [selectedId, scene])

  useEffect(() => {
    const entities = scene?.entities ?? []
    const service = scene?.services.find(item => item.id === selectedServiceId)
    const dependencyEntities = entities.filter(e => service?.requiredEntityIds.includes(e.id))
    overlay.current?.setProps({ layers: [
      new PolygonLayer<Scene['services'][number]>({
        id: 'service-area', data: showAreas ? scene?.services ?? [] : [], getPolygon: s => s.area,
        extruded: viewMode === 'terrain', getElevation: 500, wireframe: viewMode === 'terrain',
        getFillColor: s => s.id === selectedServiceId ? (s.status === 'unavailable' ? [111, 45, 48, 52] : [39, 117, 112, 45]) : [27, 55, 67, 12],
        getLineColor: s => s.id === selectedServiceId ? (s.status === 'unavailable' ? [211, 88, 83, 170] : [78, 166, 156, 160]) : [92, 127, 143, 70],
        getLineWidth: 1, lineWidthMinPixels: 1, stroked: true,
      }),
      new PathLayer({
        id: 'planned-routes', data: showRoutes ? scene?.routes ?? [] : [], getPath: route => route.coordinates,
        getColor: [104, 174, 193, 140], getWidth: 2, widthMinPixels: 2,
      }),
      new PathLayer({
        id: 'dependency-links', data: showDependencies && dependencyEntities.length >= 2 ? [{ path: dependencyEntities.map(e => [e.position.longitudeDeg, e.position.latitudeDeg]) }] : [],
        getPath: item => item.path, getColor: service?.status === 'unavailable' ? [241, 105, 98, 220] : [255, 211, 106, 210],
        getWidth: 3, widthMinPixels: 3,
      }),
      new PolygonLayer<Entity>({
        id: 'entities', data: entities, getPolygon: silhouette,
        getFillColor: e => e.condition === 'unavailable' ? [241, 105, 98, 230] : e.id === selectedId ? [255, 211, 106, 255] : [111, 225, 213, 235],
        getLineColor: [7, 23, 32, 255], getLineWidth: 2, lineWidthMinPixels: 2, stroked: true,
        pickable: true, onClick: info => { if (info.object) onSelectRef.current(info.object.id) },
      }),
      new TextLayer<Entity>({
        id: 'entity-labels', data: entities, getPosition: e => [e.position.longitudeDeg, e.position.latitudeDeg],
        getText: e => e.label, getColor: [218, 231, 237], getSize: 12, getPixelOffset: [0, 29],
        getTextAnchor: 'middle', getAlignmentBaseline: 'top', fontFamily: 'Arial, sans-serif',
      }),
      new ScatterplotLayer<Forecast>({
        id: 'weather-points', data: showWeather ? forecasts.filter(item => item.status === 'connected' && item.gridPoint) : [],
        getPosition: item => item.gridPoint!, getRadius: 1800, radiusMinPixels: 7, radiusMaxPixels: 13,
        getFillColor: [112, 206, 255, 210], getLineColor: [219, 246, 255, 255], lineWidthMinPixels: 2, stroked: true,
        pickable: true, onClick: info => { if (info.object) onSelectWeatherRef.current(info.object.location) },
      }),
      new TextLayer<Forecast>({
        id: 'weather-labels', data: showWeather ? forecasts.filter(item => item.status === 'connected' && item.gridPoint) : [],
        getPosition: item => item.gridPoint!, getText: item => `${item.label.toUpperCase()}  ${item.data?.air_temperature ?? '—'}°`,
        getColor: [206, 235, 250, 255], getSize: 13, getPixelOffset: [0, -24], getTextAnchor: 'middle', getAlignmentBaseline: 'bottom',
      }),
    ] })
  }, [scene, selectedId, selectedServiceId, showDependencies, showRoutes, showAreas, showWeather, forecasts, viewMode])

  return <div className="map" ref={container} aria-label="Synthetic operations map" />
}
