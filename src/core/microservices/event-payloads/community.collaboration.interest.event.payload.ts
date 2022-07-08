export type CommunityCollaborationInterestEventPayload = {
  userID: string;
  opportunity: {
    name: string;
    communityName: string | undefined;
  };
};
