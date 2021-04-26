export interface IMessageRequest {
  text: string;
}

export interface ICommunityMessageRequest extends IMessageRequest {
  communityId: string;
}

export interface IDirectMessageRequest extends IMessageRequest {
  email: string;
}

export interface IResponseMessage {
  originServerTimestamp: number;
  body: string;
}

export interface IMatrixCommunicationService {
  getCommunities(): Promise<any[]>;
  getRooms(): Promise<any[]>;
  getUserMessages(
    email: string
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
  message(room: string, content: IMessageRequest): Promise<void>;
  messageUser(content: IDirectMessageRequest): Promise<string>;
  messageCommunity(content: ICommunityMessageRequest): Promise<string>;
}
