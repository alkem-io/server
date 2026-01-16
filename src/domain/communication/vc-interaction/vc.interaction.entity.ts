// VcInteraction data structure - stored as JSON in Room entity
export type VcInteractionData = {
  virtualContributorActorID: string; // VC's agent.id
  externalThreadId?: string; // AI service thread ID
};

// Type for the JSON column in Room
export type VcInteractionsByThread = Record<string, VcInteractionData>;

// Still used by AI service DTOs for external thread context
export type ExternalMetadata = {
  threadId?: string;
};
