export type Entity = {
  id: string; resourceId: string; kind: 'fixed_wing' | 'multirotor' | 'ground_vehicle' | 'facility';
  label: string; position: { longitudeDeg: number; latitudeDeg: number; altitudeDatum: string };
  headingDeg: number; condition: 'normal' | 'degraded' | 'unavailable';
  sourceKind: 'simulated'; stale: boolean; scenarioId: string; worldRevision: number; modelVersion: string;
}
export type Scene = {
  scenarioId: string; worldRevision: number; modelVersion: string; sourceKind: 'simulated'; dataNotice: string;
  entities: Entity[];
  services: { id: string; label: string; status: 'available' | 'unavailable'; blockers: string[]; requiredEntityIds: string[]; explanation: string; area: [number, number][] }[];
  routes: { id: string; kind: 'planned'; entityId: string; coordinates: [number, number][] }[];
  events: { id: string; assetId: string; kind: string; worldRevision: number; recordedAt: string; sourceKind: string }[];
}
