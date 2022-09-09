import { HubPayload } from './hub.payload';

export type AspectCommentCreatedEventPayload = {
  aspect: {
    displayName: string;
    createdBy: string;
  };
  comment: {
    message: string;
    createdBy: string;
  };
  community: {
    name: string;
    type: string;
  };
  hub: HubPayload;
};
