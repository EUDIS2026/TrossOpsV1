import { useEffect, useRef, useState } from 'react'
import { MapScene } from './MapScene'
import type { Scene } from './types'

export function App() {
  const [scene, setScene] = useState<Scene | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>('uav-01')
  const [selectedServiceId, setSelectedServiceId] = useState('survey-sector-alpha')
  const [busy, setBusy] = useState(false)
  const [showDependencies, setShowDependencies] = useState(false)
  const [showRoutes, setShowRoutes] = useState(true)
  const [showAreas, setShowAreas] = useState(true)
  const [search, setSearch] = useState('')
  const [basemapMode, setBasemapMode] = useState<'online' | 'local'>('online')
  const [error, setError] = useState('')
  const revisionRequest = useRef(0)

  async function refreshScene() {
    setError('')
    try {
      const response = await fetch('/api/scene')
      if (!response.ok) throw new Error(`Scene request failed: ${response.status}`)
      setScene(await response.json())
    } catch (e) { setError(String(e)) }
  }

  useEffect(() => { void refreshScene() }, [])
  const selected = scene?.entities.find(e => e.id === selectedId)
  const service = scene?.services.find(item => item.id === selectedServiceId)
  const replaying = !!scene && scene.worldRevision < scene.latestRevision
  const visibleEntities = scene?.entities.filter(entity => `${entity.label} ${entity.kind} ${entity.resourceId}`.toLowerCase().includes(search.toLowerCase())) ?? []

  async function loadRevision(revision: number) {
    const request = ++revisionRequest.current
    setError('')
    try {
      const response = await fetch(`/api/scene?revision=${revision}`)
      if (!response.ok) throw new Error(`Revision ${revision} could not be loaded`)
      const result: Scene = await response.json()
      if (request === revisionRequest.current) setScene(result)
    } catch (e) { if (request === revisionRequest.current) setError(String(e)) }
  }

  async function update(kind: 'fault' | 'repair') {
    if (!scene || !selected || replaying) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: selected.id, kind, expectedRevision: scene.worldRevision }) })
      if (response.status === 409) {
        await refreshScene()
        setError('The world changed in another session. Latest revision loaded; review it before retrying.')
        return
      }
      if (!response.ok) throw new Error((await response.json()).detail ?? `Event failed: ${response.status}`)
      setScene(await response.json())
    } catch (e) { setError(String(e)) } finally { setBusy(false) }
  }

  return <div className="shell">
    <header className="topbar"><div className="brand"><span className="brandmark">T</span><strong>TROSSOPS</strong><span className="divider" />OPERATIONS</div><div className="topmeta"><span className="live-dot" />{replaying ? 'REPLAY MODE' : 'SYNTHETIC WORLD'} <span className="revision">REV {scene?.worldRevision ?? '—'}</span></div></header>
    {error && <div role="alert" className="status-banner"><span>{error}</span><button onClick={() => void refreshScene()}>Reload scene</button></div>}
    <main className="workspace">
      <aside className="sidebar"><div className="section-kicker">WORKSPACE</div><h1>Operations</h1><p className="subtle">Sector Alpha · synthetic exercise</p>
        <div className="separator" /><div className="section-kicker">FLEET ASSETS <span>{scene?.entities.length ?? 0}</span></div><input className="asset-search" type="search" aria-label="Search assets" placeholder="Search assets" value={search} onChange={event => setSearch(event.target.value)} />
        <div className="entity-list">{visibleEntities.map(e => <button key={e.id} className={`entity-row ${selectedId === e.id ? 'active' : ''}`} onClick={() => setSelectedId(e.id)}><span className={`entity-glyph ${e.condition}`} /> <span><strong>{e.label}</strong><small>{e.kind.replace('_', ' ')} · {e.condition}</small></span></button>)}{visibleEntities.length === 0 && <p className="subtle">No matching assets.</p>}</div>
        <div className="separator" /><div className="section-kicker">SERVICE DEMAND <span>{scene?.services.length ?? 0}</span></div><div className="service-list">{scene?.services.map(item => <button key={item.id} className={`service-row ${item.id === selectedServiceId ? 'active' : ''}`} onClick={() => setSelectedServiceId(item.id)}><strong>{item.label}</strong><small className={item.status}>{item.status.toUpperCase()}</small></button>)}</div>
        <div className="separator" /><div className="section-kicker">LAYERS</div><div className="layer-list"><button aria-pressed={showAreas} onClick={() => setShowAreas(value => !value)}>Service areas <span>{showAreas ? 'ON' : 'OFF'}</span></button><button aria-pressed={showRoutes} onClick={() => setShowRoutes(value => !value)}>Planned routes <span>{showRoutes ? 'ON' : 'OFF'}</span></button></div>
        <div className="sidebar-foot">{scene?.dataNotice ?? 'Connecting to scene…'}</div>
      </aside>
      <section className="scene-panel"><div className="map-head"><div><span className="section-kicker">OPERATIONAL SCENE</span><h2>Sector Alpha</h2></div><div className="map-controls"><button className={basemapMode === 'online' ? 'selected' : ''} onClick={() => setBasemapMode('online')}>Map</button><button className={basemapMode === 'local' ? 'selected' : ''} onClick={() => setBasemapMode('local')}>Local grid</button><div className="map-status">2D VIEW <span>·</span> SIMULATED</div></div></div>
        <div className="map-wrap"><MapScene scene={scene} selectedId={selectedId} selectedServiceId={selectedServiceId} showDependencies={showDependencies} showRoutes={showRoutes} showAreas={showAreas} basemapMode={basemapMode} onBasemapFailure={() => setBasemapMode('local')} onSelect={setSelectedId} /><div className="map-grid" aria-hidden="true" /><div className="map-corner">59° N<br />17° E</div><div className="map-badge">{basemapMode === 'online' ? 'OPENFREEMAP · SYNTHETIC SCENE' : 'LOCAL GRID · SYNTHETIC SCENE'}</div><div className="map-legend"><span><i className="legend-area" />Service area</span><span><i className="legend-route" />Planned route</span><span><i className="legend-asset" />Asset</span></div></div>
        <div className="scene-footer"><span>NO LIVE TELEMETRY</span><span>MODEL {scene?.modelVersion ?? '—'}</span><span>WGS84 · POSITION APPROXIMATE</span></div>
      </section>
      <aside className="inspector"><div className="section-kicker">INSPECTOR</div><h2>{selected?.label ?? 'Select an asset'}</h2><p className="subtle">{selected?.resourceId ?? 'Select an entity to inspect its state.'}</p>
        {selected && <><div className="metric"><span>Condition</span><strong className={selected.condition === 'unavailable' ? 'danger' : 'good'}>{selected.condition.toUpperCase()}</strong></div><div className="metric"><span>Source</span><strong>SIMULATED</strong></div><div className="metric"><span>World revision</span><strong>{selected.worldRevision}</strong></div><div className="actions"><button disabled={busy || replaying || selected.condition === 'unavailable'} onClick={() => update('fault')}>Record fault</button><button disabled={busy || replaying || selected.condition === 'normal'} onClick={() => update('repair')}>Record repair</button></div></>}
        <div className="separator" /><div className="section-kicker">SERVICE CONSEQUENCE</div><div className={`service-card ${service?.status ?? ''}`}><strong>{service?.label ?? 'Loading…'}</strong><span>{service?.status?.toUpperCase() ?? '—'}</span><p>{service?.blockers.length ? service.blockers.join('; ') : 'All required assets operational.'}</p></div><p className="explainer">{service?.explanation}</p><button className={`dependency-toggle ${showDependencies ? 'on' : ''}`} onClick={() => setShowDependencies(value => !value)} aria-pressed={showDependencies}>Dependency X-ray {showDependencies ? 'on' : 'off'}</button>
        <div className="separator" /><div className="section-kicker">REVISION REPLAY</div><div className="replay-controls"><input aria-label="World revision" type="range" min="1" max={scene?.latestRevision ?? 1} value={scene?.worldRevision ?? 1} onChange={event => loadRevision(Number(event.target.value))} /><div><span>REV 1</span><strong>REV {scene?.worldRevision ?? 1} / {scene?.latestRevision ?? 1}</strong></div>{replaying && <button onClick={() => loadRevision(scene!.latestRevision)}>Return to latest</button>}</div>
        <div className="separator" /><div className="section-kicker">EVENT HISTORY</div><div className="timeline">{scene?.events.length ? [...scene.events].reverse().map(event => <div className="event" key={event.id}><b>{event.kind.toUpperCase()}</b><span>{event.assetId}</span><small>REV {event.worldRevision}</small></div>) : <p className="subtle">No events at this revision.</p>}</div>
      </aside>
    </main>
  </div>
}
