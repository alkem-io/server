/** Minimal operator evidence. No storage hash, credentials or message text. */
export interface MediaEvent {
  roomId: string;
  matrixRoomId: string;
  eventId: string;
  senderId: string | null;
  mediaId: string;
  displayName: string;
  threadId: string | null;
  timestamp: number;
}
export interface RoomCoverage {
  roomId: string;
  matrixRoomId?: string;
  mappingComplete: boolean;
  paginationComplete: boolean;
  pages: number;
  eventsScanned: number;
  attachmentsExported: number;
  skippedByReason: Record<string, number>;
  failure?: string;
}
export interface Coverage {
  schemaVersion: 1;
  scope: 'fixture' | 'supported-room-inventory';
  homeserver: string;
  requestedRoomIds: string[];
  resolvedRoomIds: string[];
  startedAt: string;
  completedAt: string;
  complete: boolean;
  rooms: RoomCoverage[];
}
export interface NormalizationFile {
  id: string;
  bucketId: string;
  reference?: string;
  complete: boolean;
  reused?: boolean;
}
export interface NormalizationPort {
  supportedRooms(): Promise<string[]>;
  targetBucket(roomId: string): Promise<string | undefined>;
  referenceSource(reference: string): Promise<NormalizationFile | undefined>;
  stage(reference: string): Promise<NormalizationFile | undefined>;
  association(
    bucketId: string,
    reference: string
  ): Promise<NormalizationFile | undefined>;
  permitted(bucketId: string, sourceId: string): Promise<boolean>;
  copy(
    bucketId: string,
    source: NormalizationFile,
    event: MediaEvent
  ): Promise<NormalizationFile>;
  move(
    bucketId: string,
    source: NormalizationFile,
    event: MediaEvent
  ): Promise<NormalizationFile>;
  removeStage(fileId: string): Promise<void>;
}
export interface NormalizationTarget {
  bucketId: string;
  event: MediaEvent;
  state: 'complete' | 'missing' | 'incomplete';
  approved: boolean;
  reason?: string;
}
export interface NormalizationGroup {
  mediaId: string;
  eligible: boolean;
  reason?: string;
  events: MediaEvent[];
  targets: NormalizationTarget[];
}
export interface NormalizationPlan {
  schemaVersion: 1;
  supportedRoomIds: string[];
  coverage: Coverage;
  events: MediaEvent[];
  groups: NormalizationGroup[];
}
export interface NormalizationResult {
  schemaVersion: 1;
  ok: boolean;
  counts: {
    scanned: number;
    eligible: number;
    copied: number;
    moved: number;
    reused: number;
    redundantStageRemoved: number;
    reconciled: number;
    skipped: number;
    failed: number;
  };
  records: Array<{
    mediaId: string;
    outcome: 'completed' | 'skipped' | 'failed';
    reason?: string;
    eventIds: string[];
    associations: Array<{
      bucketId: string;
      outcome: 'complete' | 'excluded' | 'unavailable';
    }>;
  }>;
}
