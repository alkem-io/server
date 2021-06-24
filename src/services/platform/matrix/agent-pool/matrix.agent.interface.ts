export interface IMessageRequest {
  text: string;
}

export interface ICommunityMessageRequest extends IMessageRequest {
  communityId: string;
}

export interface IInitiateDirectMessageRequest {
  email: string;
}

export interface IResponseMessage {
  originServerTimestamp: number;
  body: string;
}

export interface IMatrixAgent {
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
  initiateMessagingToUser(
    content: IInitiateDirectMessageRequest
  ): Promise<string>;
  message(room: string, content: IMessageRequest): Promise<void>;
  messageCommunity(content: ICommunityMessageRequest): Promise<string>;
}
