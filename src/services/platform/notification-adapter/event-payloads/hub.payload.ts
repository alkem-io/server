export type HubPayload = {
  nameID: string;
  id: string;
  challenge?: {
    nameID: string;
    id: string;
    opportunity?: {
      nameID: string;
      id: string;
    };
  };
};
