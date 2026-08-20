import { ReactionType } from '@common/enums/reaction.type';

export interface IReaction {
  id: string;
  type: ReactionType;
  entityID: string;
  createdBy: string;
  emoji: string;
  createdDate: Date;
  updatedDate: Date;
}
