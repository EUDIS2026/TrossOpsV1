import { useEffect, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowUpRight, Building2, ChevronDown, CloudSun, Compass,
  Crosshair, Database, Eye, EyeOff, Globe2, History, Layers3, Map as MapIcon,
  MapPin, Mountain, PanelLeftClose, Radar, RotateCcw, Search, Shield, Sparkles, Thermometer, Wind, X,
} from 'lucide-react'
import { MapScene } from './MapScene'
import type { Entity, Forecast, ScenarioPreview, Scene, ViewMode } from './types'

type Panel = 'layers' | 'environment' | 'activity'
type LayerKey = 'areas' | 'routes' | 'counties' | 'weather' | 'dependencies'

const pointFallbacks: Record<string, [number, number]> = {
  stockholm: [18.06, 59.33], goteborg: [11.97, 57.71], malmo: [13, 55.61], kiruna: [20.22, 67.86],
}
const cityOrder = ['stockholm', 'goteborg', 'malmo', 'kiruna']

function formatTime(value?: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function numberText(value: number | null | undefined, digits = 0): string {
  return typeof value === 'number' ? value.toFixed(digits) : '—'
}

function LayerSwitch({ label, detail, checked, onClick }: { label: string; detail: string; checked: boolean; onClick: () => void }) {
  return <button className="ws-layer-row" aria-pressed={checked} onClick={onClick}>
    <span className={`ws-check ${checked ? 'active' : ''}`}>{checked ? <Eye size={12} /> : <EyeOff size={12} />}</span>
    <span className="ws-layer-copy"><strong>{label}</strong><small>{detail}</small></span>
    <span className={`ws-layer-state ${checked ? 'on' : ''}`}>{checked ? 'ON' : 'OFF'}</span>
  </button>
}

function AssetList({ entities, selectedId, search, setSearch, onSelect }: {
  entities: Entity[]; selectedId: string | null; search: string; setSearch: (value: string) => void; onSelect: (id: string) => void;
}) {
  const visible = entities.filter(entity => `${entity.label} ${entity.kind} ${entity.resourceId}`.toLowerCase().includes(search.toLowerCase()))
  return <>
    <label className="ws-search"><Search size={15} /><input aria-label="Search assets" placeholder="Search assets" value={search} onChange={event => setSearch(event.target.value)} /></label>
    <div className="ws-list-head"><span>SCENE ENTITIES</span><span>{entities.length.toString().padStart(2, '0')}</span></div>
    <div className="ws-asset-list">{visible.map(entity => <button className={`ws-asset ${selectedId === entity.id ? 'active' : ''}`} key={entity.id} onClick={() => onSelect(entity.id)}>
      <span className={`ws-asset-symbol ${entity.condition}`}>{entity.kind === 'facility' ? '▣' : entity.kind === 'ground_vehicle' ? '◆' : '✦'}</span>
      <span><strong>{entity.label}</strong><small>{entity.kind.replace('_', ' ')} <i /> {entity.condition}</small></span>
      <ArrowUpRight size={14} className="ws-asset-arrow" />
    </button>)}{visible.length === 0 && <p className="ws-empty">No matching assets.</p>}</div>
  </>
}

export function App() {
  const [scene, setScene] = useState<Scene | null>(null)
  const [forecasts, setForecasts] = useState<Forecast[]>([])
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [panel, setPanel] = useState<Panel>('layers')
  const [selectedId, setSelectedId] = useState<string | null>('uav-01')
  const [selectedServiceId, setSelectedServiceId] = useState('survey-sector-alpha')
  const [selectedLocation, setSelectedLocation] = useState('stockholm')
  const [inspectorTab, setInspectorTab] = useState<'asset' | 'environment'>('asset')
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [basemapMode, setBasemapMode] = useState<'online' | 'local'>('online')
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ areas: true, routes: true, counties: false, weather: true, dependencies: false })
  const [search, setSearch] = useState('')
  const [focus, setFocus] = useState<{ point: [number, number]; zoom: number; key: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [analysisStatus, setAnalysisStatus] = useState<'adapter-only' | 'configured'>('adapter-only')
  const [analysis, setAnalysis] = useState<{ answer: string; worldRevision: number; serviceId: string; model: string } | null>(null)
  const [analysisBusy, setAnalysisBusy] = useState(false)
  const [analysisAccessToken, setAnalysisAccessToken] = useState('')
  const [preview, setPreview] = useState<ScenarioPreview | null>(null)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760)
  const [inspectorOpen, setInspectorOpen] = useState(() => window.innerWidth > 760)
  const revisionRequest = useRef(0)

  const displayScene = preview?.candidate ?? scene
  const selected = displayScene?.entities.find(entity => entity.id === selectedId)
  const service = displayScene?.services.find(item => item.id === selectedServiceId)
  const forecast = forecasts.find(item => item.location === selectedLocation)
  const replaying = !!scene && scene.worldRevision < scene.latestRevision
  const unavailableCount = scene?.services.filter(item => item.status === 'unavailable').length ?? 0

  function toggleLayer(key: LayerKey) { setLayers(current => ({ ...current, [key]: !current[key] })) }

  async function refreshScene() {
    setError('')
    setPreview(null)
    try {
      const response = await fetch('/api/scene')
      if (!response.ok) throw new Error(`Scene request failed: ${response.status}`)
      setScene(await response.json())
    } catch (cause) { setError(String(cause)) }
  }

  async function refreshForecasts() {
    setWeatherLoading(true)
    const results = await Promise.all(cityOrder.map(async location => {
      try {
        const response = await fetch(`/api/environment/forecast/${location}`)
        if (!response.ok) throw new Error('Forecast request failed')
        return await response.json() as Forecast
      } catch { return { status: 'unavailable', source: 'SMHI SNOW1G point forecast', kind: 'forecast', location, label: location, reason: 'Forecast source unavailable.' } as Forecast }
    }))
    setForecasts(results)
    setWeatherLoading(false)
  }

  useEffect(() => {
    void refreshScene()
    void refreshForecasts()
    void fetch('/api/analysis/status').then(response => response.json()).then(value => setAnalysisStatus(value.status)).catch(() => setAnalysisStatus('adapter-only'))
    const timer = window.setInterval(() => void refreshForecasts(), 10 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  async function loadRevision(revision: number) {
    const request = ++revisionRequest.current
    setError('')
    setPreview(null)
    try {
      const response = await fetch(`/api/scene?revision=${revision}`)
      if (!response.ok) throw new Error(`Revision ${revision} could not be loaded`)
      const result: Scene = await response.json()
      if (request === revisionRequest.current) setScene(result)
    } catch (cause) { if (request === revisionRequest.current) setError(String(cause)) }
  }

  async function update(kind: 'fault' | 'repair') {
    if (!scene || !selected || replaying || preview) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: selected.id, kind, expectedRevision: scene.worldRevision }) })
      if (response.status === 409) {
        await refreshScene()
        setError('The world changed in another session. Latest revision loaded; review it before retrying.')
        return
      }
      if (!response.ok) throw new Error((await response.json()).detail ?? `Event failed: ${response.status}`)
      setScene(await response.json())
    } catch (cause) { setError(String(cause)) } finally { setBusy(false) }
  }

  async function requestAnalysis() {
    if (!scene || analysisStatus !== 'configured') return
    setAnalysisBusy(true)
    setError('')
    try {
      const response = await fetch('/api/analysis/service', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-TrossOps-Analysis-Token': analysisAccessToken },
        body: JSON.stringify({ serviceId: selectedServiceId, worldRevision: scene.worldRevision }),
      })
      if (!response.ok) throw new Error('Model analysis is unavailable.')
      setAnalysis(await response.json())
    } catch (cause) { setError(String(cause)) } finally { setAnalysisBusy(false) }
  }

  async function previewEvent(kind: 'fault' | 'repair') {
    if (!scene || !selected) return
    setPreviewBusy(true)
    setError('')
    try {
      const response = await fetch('/api/scenarios/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: selected.id, kind, baseRevision: scene.worldRevision }),
      })
      if (!response.ok) throw new Error('Scenario preview unavailable.')
      setPreview(await response.json())
      setFocus({ point: [selected.position.longitudeDeg, selected.position.latitudeDeg], zoom: 9.6, key: Date.now() })
    } catch (cause) { setError(String(cause)) } finally { setPreviewBusy(false) }
  }

  function focusCity(key: string) {
    setSelectedLocation(key)
    setInspectorTab('environment')
    setInspectorOpen(true)
    const point = forecasts.find(item => item.location === key)?.gridPoint ?? pointFallbacks[key]
    setFocus({ point, zoom: 9.4, key: Date.now() })
  }

  function selectAsset(id: string) { setSelectedId(id); setInspectorTab('asset'); setInspectorOpen(true) }

  function openPanel(next: Panel) {
    setSidebarOpen(current => next === panel ? !current : true)
    setPanel(next)
  }

  return <div className={`ws-shell ${sidebarOpen ? '' : 'sidebar-collapsed'} ${inspectorOpen ? '' : 'inspector-collapsed'}`}>
    <header className="ws-topbar">
      <div className="ws-brand"><div className="ws-brand-icon"><Radar size={22} strokeWidth={1.5} /></div><span className="ws-wordmark">TROSS<span>OPS</span></span><span className="ws-brand-rule" /><span className="ws-product">GEOSPATIAL WORKSTATION</span></div>
      <div className="ws-top-center"><span className="ws-online-pip" /> SYNTHETIC EXERCISE <span className="ws-top-separator">/</span> SWEDEN <span className="ws-top-separator">/</span> {preview ? 'WHAT-IF PREVIEW' : replaying ? 'REPLAY' : 'CURRENT REVISION'}</div>
      <div className="ws-top-actions"><span className="ws-top-revision">WORLD REV <b>{scene?.worldRevision ?? '—'}</b></span><button title="Reload scene" onClick={() => void refreshScene()}><RotateCcw size={16} /></button><div className="ws-avatar">TO</div></div>
    </header>

    <div className="ws-body">
      <nav className="ws-rail" aria-label="Workstation panels">
        <div className="ws-rail-group"><button className={sidebarOpen && panel === 'layers' ? 'active' : ''} title="Layers" aria-label="Layers" aria-pressed={sidebarOpen && panel === 'layers'} onClick={() => openPanel('layers')}><Layers3 size={20} /></button><button className={sidebarOpen && panel === 'environment' ? 'active' : ''} title="Environment" aria-label="Environment" aria-pressed={sidebarOpen && panel === 'environment'} onClick={() => openPanel('environment')}><CloudSun size={20} /></button><button className={sidebarOpen && panel === 'activity' ? 'active' : ''} title="Activity" aria-label="Activity" aria-pressed={sidebarOpen && panel === 'activity'} onClick={() => openPanel('activity')}><History size={20} /></button></div>
        <div className="ws-rail-bottom"><button title="Focus Sweden" aria-label="Focus Sweden" onClick={() => setFocus({ point: [17, 63], zoom: 4.5, key: Date.now() })}><Crosshair size={19} /></button><span>SE</span></div>
      </nav>

      <aside className="ws-sidebar">
        <div className="ws-sidebar-heading"><div className="ws-panel-heading-line"><span className="ws-eyebrow">WORKSPACE / {panel.toUpperCase()}</span><button title="Close sidebar" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)}><PanelLeftClose size={17} /></button></div><h1>{panel === 'layers' ? 'Scene layers' : panel === 'environment' ? 'Environment' : 'Activity log'}</h1><p>{panel === 'layers' ? 'Compose the operational picture.' : panel === 'environment' ? 'Public forecasts from SMHI.' : 'Revisioned synthetic event history.'}</p></div>
        {panel === 'layers' && <>
          <AssetList entities={displayScene?.entities ?? []} selectedId={selectedId} search={search} setSearch={setSearch} onSelect={selectAsset} />
          <div className="ws-list-head ws-spaced"><span>SERVICE DEMAND</span><span>{scene?.services.length ?? 0}</span></div>
          <div className="ws-service-list">{displayScene?.services.map(item => <button key={item.id} className={`ws-service ${item.id === selectedServiceId ? 'active' : ''}`} onClick={() => setSelectedServiceId(item.id)}><span className={`ws-service-icon ${item.status}`}><Activity size={15} /></span><span><strong>{item.label}</strong><small>{item.requiredEntityIds.length} dependencies · {item.status}</small></span></button>)}</div>
          <div className="ws-list-head ws-spaced"><span>DISPLAY LAYERS</span><ChevronDown size={14} /></div>
          <LayerSwitch label="Service geography" detail="Computed service areas" checked={layers.areas} onClick={() => toggleLayer('areas')} />
          <LayerSwitch label="Planned movement" detail="Synthetic proposed routes" checked={layers.routes} onClick={() => toggleLayer('routes')} />
          <LayerSwitch label="County boundaries" detail="SCB · display only" checked={layers.counties} onClick={() => toggleLayer('counties')} />
          <LayerSwitch label="Weather points" detail="SMHI · live forecast" checked={layers.weather} onClick={() => toggleLayer('weather')} />
          <LayerSwitch label="Dependency X-ray" detail="Selected service prerequisites" checked={layers.dependencies} onClick={() => toggleLayer('dependencies')} />
        </>}
        {panel === 'environment' && <><div className="ws-list-head"><span>PUBLIC FORECAST POINTS</span><span>{weatherLoading ? 'SYNC' : '04'}</span></div><div className="ws-city-list">{cityOrder.map(key => { const item = forecasts.find(value => value.location === key); return <button key={key} className={`ws-city ${selectedLocation === key ? 'active' : ''}`} onClick={() => focusCity(key)}><MapPin size={15} /><span><strong>{item?.label ?? key}</strong><small>{item?.status === 'connected' ? `Valid ${formatTime(item.validTime)}` : 'Source unavailable'}</small></span><b>{item?.status === 'connected' ? `${numberText(item.data?.air_temperature, 1)}°` : '—'}</b></button> })}</div><div className="ws-source-note"><Shield size={16} /><span>Forecast data is public and time stamped. It is not an observation or a direct input to service feasibility.</span></div></>}
        {panel === 'activity' && <><div className="ws-list-head"><span>EVENT STREAM</span><span>REV {scene?.worldRevision ?? '—'}</span></div><div className="ws-event-list">{scene?.events.length ? [...scene.events].reverse().map(event => <div className="ws-event" key={event.id}><span className={`ws-event-dot ${event.kind}`} /><div><strong>{event.kind === 'fault' ? 'Fault recorded' : 'Repair recorded'}</strong><small>{event.assetId} · {formatTime(event.recordedAt)}</small></div><b>R{event.worldRevision}</b></div>) : <p className="ws-empty">No events at this revision.</p>}</div></>}
        <div className="ws-sidebar-footer"><Database size={15} /><span>{displayScene?.dataNotice ?? 'Connecting to scene...'}</span></div>
      </aside>

      <main className="ws-stage">
        <MapScene scene={displayScene} selectedId={selectedId} selectedServiceId={selectedServiceId} showDependencies={layers.dependencies} showRoutes={layers.routes} showAreas={layers.areas} showCounties={layers.counties} showWeather={layers.weather} basemapMode={basemapMode} viewMode={viewMode} forecasts={forecasts} focus={focus} onBasemapFailure={() => setBasemapMode('local')} onSelect={selectAsset} onSelectWeather={focusCity} />
        <div className="ws-stage-vignette" aria-hidden="true" />
        <div className="ws-scene-header"><div><div className="ws-scene-kicker"><span className="ws-pulse" /> {preview ? 'HYPOTHETICAL SCENE' : 'OPERATIONAL GEOGRAPHY'} <span className="ws-slash">/</span> SWEDEN</div><h2>{viewMode === 'globe' ? 'Northern Europe' : viewMode === 'terrain' ? 'Terrain perspective' : viewMode === 'city' ? 'Stockholm city' : 'Regional operations'}</h2><p>Public geography + synthetic operations scene</p></div><div className="ws-mode-switch" role="group" aria-label="Map view mode"><button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}><MapIcon size={16} /> Map</button><button className={viewMode === 'terrain' ? 'active' : ''} onClick={() => setViewMode('terrain')}><Mountain size={16} /> Terrain</button><button className={viewMode === 'city' ? 'active' : ''} onClick={() => setViewMode('city')}><Building2 size={16} /> City 3D</button><button className={viewMode === 'globe' ? 'active' : ''} onClick={() => setViewMode('globe')}><Globe2 size={16} /> Globe</button></div></div>
        {preview && <div className="ws-preview-banner"><span>WHAT IF / {preview.eventKind.toUpperCase()} / {preview.assetId}</span><b>{preview.impacts.length} SERVICE {preview.impacts.length === 1 ? 'CHANGE' : 'CHANGES'}</b><button onClick={() => setPreview(null)}>Exit preview</button></div>}
        <div className="ws-map-tools"><button className={basemapMode === 'online' ? 'active' : ''} onClick={() => setBasemapMode('online')}>DARK MAP</button><button className={basemapMode === 'local' ? 'active' : ''} onClick={() => setBasemapMode('local')}>LOCAL GRID</button></div>
        <div className="ws-map-meta"><span><Compass size={14} /> WGS84</span><span><span className="ws-map-meta-dot" /> {basemapMode === 'online' ? 'OPENFREEMAP' : 'LOCAL MODE'}</span><span>{viewMode === 'terrain' ? 'MAPTERHORN DEM' : viewMode === 'city' ? 'OSM APPROX. BUILDING HEIGHTS' : viewMode === 'globe' ? 'GLOBE PROJECTION' : '2D PROJECTION'}</span></div>
        <div className="ws-weather-ribbon"><CloudSun size={16} /><span>SMHI FORECAST</span><b>{forecast?.status === 'connected' ? `${forecast.label.toUpperCase()} ${numberText(forecast.data?.air_temperature, 1)}°C` : 'UNAVAILABLE'}</b><span className="ws-ribbon-divider" /> <Wind size={15} /><span>{forecast?.status === 'connected' ? `${numberText(forecast.data?.wind_speed, 1)} m/s` : '—'}</span><small>{forecast?.status === 'connected' ? `VALID ${formatTime(forecast.validTime)}` : 'NO LIVE VALUE'}</small></div>
        <div className="ws-timeline"><div className="ws-timeline-title"><History size={16} /><span>WORLD REVISION</span><b>{replaying ? 'REPLAY' : 'LATEST'}</b></div><input aria-label="World revision" type="range" min="1" max={scene?.latestRevision ?? 1} value={scene?.worldRevision ?? 1} onChange={event => void loadRevision(Number(event.target.value))} /><span className="ws-timeline-count">{scene?.worldRevision ?? 1} / {scene?.latestRevision ?? 1}</span>{replaying && <button onClick={() => void loadRevision(scene!.latestRevision)}>Return to latest</button>}</div>
        {error && <div role="alert" className="ws-error"><AlertTriangle size={16} /><span>{error}</span><button onClick={() => void refreshScene()}>Reload scene</button></div>}
      </main>

      <aside className="ws-inspector"><div className="ws-inspector-head"><div><span className="ws-eyebrow">CONTEXT INSPECTOR</span><h2>{inspectorTab === 'asset' ? 'Asset detail' : 'Environmental data'}</h2></div><button title="Close inspector" aria-label="Close inspector" onClick={() => setInspectorOpen(false)}><X size={18} /></button></div><div className="ws-inspector-tabs"><button className={inspectorTab === 'asset' ? 'active' : ''} onClick={() => setInspectorTab('asset')}>ASSET</button><button className={inspectorTab === 'environment' ? 'active' : ''} onClick={() => setInspectorTab('environment')}>ENVIRONMENT</button></div>
        {inspectorTab === 'asset' ? <div className="ws-inspector-content"><div className="ws-object-card"><div className="ws-object-icon">{selected?.kind === 'facility' ? '▣' : selected?.kind === 'ground_vehicle' ? '◆' : '✦'}</div><div><span className="ws-eyebrow">{preview ? 'HYPOTHETICAL ENTITY' : 'SYNTHETIC ENTITY'}</span><h3>{selected?.label ?? 'Select an asset'}</h3><p>{selected?.resourceId ?? 'No selection'}</p></div></div>{selected && <><div className="ws-status-line"><span>OPERATIONAL STATE</span><b className={selected.condition}>{selected.condition.toUpperCase()}</b></div><div className="ws-detail-grid"><div><span>CLASS</span><b>{selected.kind.replace('_', ' ')}</b></div><div><span>HEADING</span><b>{selected.headingDeg}°</b></div><div><span>WORLD REV</span><b>{selected.worldRevision}</b></div><div><span>PROVENANCE</span><b>{preview ? 'WHAT-IF' : 'SIMULATED'}</b></div></div><div className="ws-object-actions"><button disabled={busy || replaying || !!preview || selected.condition === 'unavailable'} onClick={() => void update('fault')}>Record fault</button><button disabled={busy || replaying || !!preview || selected.condition === 'normal'} onClick={() => void update('repair')}>Record repair</button></div><div className="ws-preview-actions">{preview ? <button onClick={() => setPreview(null)}>Return to current world</button> : <button disabled={previewBusy} onClick={() => void previewEvent(selected.condition === 'unavailable' ? 'repair' : 'fault')}>{previewBusy ? 'Computing preview…' : `Preview ${selected.condition === 'unavailable' ? 'repair' : 'fault'} impact`}</button>}</div></>}
          <div className="ws-section-title"><Activity size={15} /> SERVICE CONSEQUENCE</div><div className={`ws-consequence ${service?.status ?? ''}`}><div><span>{service?.label ?? 'Loading...'}</span><b>{service?.status?.toUpperCase() ?? '—'}</b></div><p>{service?.blockers.length ? service.blockers.join(' · ') : 'All required assets operational.'}</p></div><p className="ws-evidence">Computed from required entity conditions at world revision {scene?.worldRevision ?? '—'}. Synthetic exercise.</p><button className={`ws-xray ${layers.dependencies ? 'active' : ''}`} onClick={() => toggleLayer('dependencies')}><Eye size={15} /> Dependency X-ray <span>{layers.dependencies ? 'ON' : 'OFF'}</span></button>
          <div className="ws-section-title"><Sparkles size={15} /> SCENE ANALYSIS</div><div className="ws-ai-card"><div className="ws-ai-status"><span>{analysisStatus === 'configured' ? 'OPENAI ADAPTER READY' : 'ADAPTER ONLY'}</span><b>{analysisStatus === 'configured' ? 'CONFIGURED' : 'NO CREDENTIAL'}</b></div>{analysisStatus === 'configured' ? <><input type="password" aria-label="Analysis access token" placeholder="Analysis access token" value={analysisAccessToken} onChange={event => setAnalysisAccessToken(event.target.value)} /><button disabled={analysisBusy || !analysisAccessToken || !!preview} onClick={() => void requestAnalysis()}>{analysisBusy ? 'Generating…' : 'Analyze selected service'}</button></> : <p>Server key, model, and access token required. No model call is made.</p>}{preview && <p>Model analysis uses committed revisions. Exit preview first.</p>}{!preview && analysis && analysis.worldRevision === scene?.worldRevision && analysis.serviceId === selectedServiceId && <div className="ws-ai-answer"><span>MODEL GENERATED · {analysis.model} · REV {analysis.worldRevision}</span><p>{analysis.answer}</p></div>}</div>
          <div className="ws-section-title"><History size={15} /> RECENT EVENTS</div><div className="ws-mini-events">{scene?.events.length ? [...scene.events].reverse().slice(0, 3).map(event => <div key={event.id}><span className={event.kind}>{event.kind.toUpperCase()}</span><span>{event.assetId}</span><b>REV {event.worldRevision}</b></div>) : <p>No events at this revision.</p>}</div>
        </div> : <div className="ws-inspector-content"><div className="ws-weather-title"><span className="ws-eyebrow">SMHI / POINT FORECAST</span><h3>{forecast?.label ?? selectedLocation}</h3><p>{forecast?.status === 'connected' ? `Valid ${formatTime(forecast.validTime)}` : 'Live forecast unavailable'}</p></div>{forecast?.status === 'connected' ? <><div className="ws-weather-hero"><Thermometer size={22} /><strong>{numberText(forecast.data?.air_temperature, 1)}<sup>°C</sup></strong><span>FORECAST AIR TEMPERATURE</span></div><div className="ws-weather-metrics"><div><Wind size={17} /><span>WIND SPEED</span><b>{numberText(forecast.data?.wind_speed, 1)} m/s</b></div><div><Compass size={17} /><span>WIND FROM</span><b>{numberText(forecast.data?.wind_from_direction)}°</b></div><div><CloudSun size={17} /><span>CLOUD COVER</span><b>{numberText(forecast.data?.cloud_area_fraction)} / 8</b></div><div><CloudSun size={17} /><span>PRECIP. PROB.</span><b>{numberText(forecast.data?.probability_of_precipitation)}%</b></div></div><div className="ws-forecast-meta"><div><span>FORECAST ISSUED</span><b>{formatTime(forecast.referenceTime)}</b></div><div><span>GRID POINT</span><b>{forecast.gridPoint?.map(value => value.toFixed(3)).join(', ') ?? '—'}</b></div><a href={forecast.sourceUrl} target="_blank" rel="noreferrer">SMHI source <ArrowUpRight size={14} /></a></div></> : <p className="ws-unavailable">{forecast?.reason ?? 'Connecting to SMHI...'}</p>}<div className="ws-source-note"><Shield size={16} /><span>Forecast values are modelled, time stamped environmental data. They are not observations or synthetic operational facts.</span></div></div>}
        <div className="ws-inspector-footer"><span className="ws-online-pip" /> {scene?.sourceKind?.toUpperCase() ?? 'CONNECTING'} WORLD <span>MODEL {scene?.modelVersion ?? '—'}</span></div>
      </aside>
    </div>
  </div>
}
