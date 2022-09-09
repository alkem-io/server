import { HubPayload } from './hub.payload';

export type AspectCreatedEventPayload = {
  aspect: {
    id: string;
    createdBy: string;
    displayName: string;
    type: string;
  };
  community: {
    name: string;
    type: string;
  };
  hub: HubPayload;
};
