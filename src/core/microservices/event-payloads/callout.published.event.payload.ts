import { HubPayload } from './hub.payload';

export type CalloutPublishedEventPayload = {
  userID: string;
  callout: {
    id: string;
    displayName: string;
    description: string;
    type: string;
  };
  community: {
    name: string;
    type: string;
  };
  hub: HubPayload;
};
