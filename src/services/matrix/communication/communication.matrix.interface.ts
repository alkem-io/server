export interface ICommunityMessageRequest {
  communityId: string;
  text: string;
}

export interface IDirectMessageRequest {
  userId: string;
  text: string;
}

export interface IResponseMessage {
  originServerTimestamp: number;
  body: string;
}

export interface IMatrixCommunicationService {
  getCommunities(): Promise<any[]>;
  getRooms(): Promise<any[]>;
  getUserMessages(
    userId: string
  ): Promise<{
    roomId: string | null;
    name: string | null;
    timeline: IResponseMessage[];
  }>;
  getCommunityMessages(
    communityId: string
  ): Promise<{
    roomId: string | null;
    name: string | null;
    timeline: IResponseMessage[];
  }>;
  messageUser(content: IDirectMessageRequest): Promise<void>;
  messageCommunity(content: ICommunityMessageRequest): Promise<void>;
}
