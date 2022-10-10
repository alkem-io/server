import { HubPayload } from './hub.payload';

export type CommunityCollaborationInterestEventPayload = {
  userID: string;
  relation: {
    role: string;
    description: string;
  };
  community: {
    id: string;
    name: string;
    type: string;
  };
  hub: HubPayload;
};
