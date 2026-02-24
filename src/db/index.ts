import Dexie, { type EntityTable } from 'dexie';

export interface Profile {
  id: string;
  name: string;
  height?: number;
  createdAt: Date;
}

export type MetricStatus = 'good' | 'warning' | 'bad';

export interface MetricResult {
  value: number;
  unit: string;
  status: MetricStatus;
  stability: number;
  mean: number;
  min: number;
  max: number;
}

export interface PostureMetrics {
  cva: MetricResult;
  headTilt: MetricResult;
  shoulderLevel: MetricResult;
  roundedShoulders: MetricResult;
  thoracicKyphosis?: MetricResult;
  lumbarLordosis?: MetricResult;
  pelvicTilt: MetricResult;
  trunkLean: MetricResult;
  kneeHyperextension?: MetricResult;
}

export type SessionType = 'quick' | 'full' | 'seated';
export type SessionAngle = 'front' | 'side' | 'both';

export interface Session {
  id: string;
  profileId: string;
  type: SessionType;
  angle: SessionAngle;
  timestamp: Date;
  duration: number;
  snapshot?: string;
  metrics: PostureMetrics;
  overallScore: number;
}

class PostureDB extends Dexie {
  profiles!: EntityTable<Profile, 'id'>;
  sessions!: EntityTable<Session, 'id'>;

  constructor() {
    super('PostureAIDB');
    this.version(1).stores({
      profiles: 'id, createdAt',
      sessions: 'id, profileId, timestamp, overallScore',
    });
  }
}

export const db = new PostureDB();

export async function getOrCreateDefaultProfile(): Promise<Profile> {
  let profile = await db.profiles.toCollection().first();
  if (!profile) {
    profile = {
      id: crypto.randomUUID(),
      name: 'Default',
      createdAt: new Date(),
    };
    await db.profiles.add(profile);
  }
  return profile;
}
