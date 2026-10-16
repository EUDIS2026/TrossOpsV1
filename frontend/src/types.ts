export type Entity = {
  id: string; resourceId: string; kind: 'fixed_wing' | 'multirotor' | 'ground_vehicle' | 'facility';
  label: string; position: { longitudeDeg: number; latitudeDeg: number; altitudeDatum: string };
  headingDeg: number; condition: 'normal' | 'degraded' | 'unavailable';
  sourceKind: 'simulated'; stale: boolean; scenarioId: string; worldRevision: number; modelVersion: string;
}
export type Scene = {
  scenarioId: string; worldRevision: number; latestRevision: number; modelVersion: string; sourceKind: 'simulated'; dataNotice: string;
  entities: Entity[];
  services: { id: string; label: string; status: 'available' | 'unavailable'; blockers: string[]; requiredEntityIds: string[]; explanation: string; area: [number, number][] }[];
  routes: { id: string; kind: 'planned'; entityId: string; coordinates: [number, number][] }[];
  events: { id: string; assetId: string; kind: string; worldRevision: number; recordedAt: string; sourceKind: string }[];
}

export type Forecast = {
  status: 'connected' | 'unavailable'; source: string; kind: 'forecast'; location: string; label: string;
  sourceUrl?: string; requestedPoint?: [number, number]; gridPoint?: [number, number];
  createdTime?: string; referenceTime?: string; validTime?: string; reason?: string;
  data?: Record<string, number | null>; units?: Record<string, string>;
}

export type ViewMode = 'map' | 'terrain' | 'globe'

export type ScenarioPreview = {
  status: 'preview'; baseRevision: number; assetId: string; eventKind: 'fault' | 'repair';
  baseline: Scene; candidate: Scene;
  impacts: { serviceId: string; label: string; before: string; after: string; blockers: string[] }[];
}
