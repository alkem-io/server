// VcInteraction data structure - stored as JSON in Room entity
export type VcInteractionData = {
  virtualContributorActorID: string; // VC's actorId
  externalThreadId?: string; // AI service thread ID
};

// Type for thread-keyed VC interactions
export type VcInteractionsByThread = Record<string, VcInteractionData>;

// Combined VC data stored in Room's vcData JSONB column
export type VcData = {
  language?: string; // Preferred language for VC responses
  interactionsByThread?: VcInteractionsByThread; // Thread-keyed VC interactions
};

// Still used by AI service DTOs for external thread context
export type ExternalMetadata = {
  threadId?: string;
};
