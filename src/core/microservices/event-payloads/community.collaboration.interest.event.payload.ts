export type CommunityCollaborationInterestEventPayload = {
  userID: string;
  opportunity: {
    id: string;
    name: string;
    communityName: string | undefined;
  };
};
