import { Community } from '@domain/community/community';

export interface ICommunityable {
  id: number;
  name: string;
  community?: Community;
}
