import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { PathLayer, PolygonLayer, TextLayer } from '@deck.gl/layers'
import type { Entity, Scene } from './types'

const style: maplibregl.StyleSpecification = {
  version: 8,
  name: 'Synthetic sector',
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#0d1824' } }],
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

type Props = { scene: Scene | null; selectedId: string | null; selectedServiceId: string; showDependencies: boolean; onSelect: (id: string) => void }

export function MapScene({ scene, selectedId, selectedServiceId, showDependencies, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const overlay = useRef<MapboxOverlay | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!container.current) return
    const instance = new maplibregl.Map({ container: container.current, style, center: [17.28, 59.27], zoom: 8.8, attributionControl: false })
    map.current = instance
    const deck = new MapboxOverlay({ interleaved: false, layers: [] })
    overlay.current = deck
    instance.addControl(deck)
    instance.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')
    return () => { instance.remove(); map.current = null; overlay.current = null }
  }, [])

  useEffect(() => {
    const entities = scene?.entities ?? []
    const service = scene?.services.find(item => item.id === selectedServiceId)
    const dependencyEntities = entities.filter(e => service?.requiredEntityIds.includes(e.id))
    overlay.current?.setProps({ layers: [
      new PolygonLayer<Scene['services'][number]>({
        id: 'service-area', data: scene?.services ?? [], getPolygon: s => s.area,
        getFillColor: s => s.id === selectedServiceId ? (s.status === 'unavailable' ? [111, 45, 48, 52] : [39, 117, 112, 45]) : [27, 55, 67, 12],
        getLineColor: s => s.id === selectedServiceId ? (s.status === 'unavailable' ? [211, 88, 83, 170] : [78, 166, 156, 160]) : [92, 127, 143, 70],
        getLineWidth: 1, lineWidthMinPixels: 1, stroked: true,
      }),
      new PathLayer({
        id: 'planned-routes', data: scene?.routes ?? [], getPath: route => route.coordinates,
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
    ] })
  }, [scene, selectedId, selectedServiceId, showDependencies])

  return <div className="map" ref={container} aria-label="Synthetic operations map" />
}
