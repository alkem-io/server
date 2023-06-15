export interface CommunicationMessagePayload {
  id: string;
  message: string;
  sender: string;
  timestamp: number;
  reactions: any[]; //todo
}
