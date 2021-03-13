import { ICommunity } from '@domain/community/community';

export interface ICommunityable {
  id: number;
  name: string;
  community?: ICommunity;
}
