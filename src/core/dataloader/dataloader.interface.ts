import { ILocation, IReference, ITagset } from '@domain/common';
import { IVisual } from '@domain/common/visual';
import { IProfile } from '@domain/community';
import DataLoader from 'dataloader';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IRelation } from '@domain/collaboration/relation/relation.interface';

export interface IDataloaders {
  userProfileLoader: DataLoader<string, IProfile>;
  orgProfileLoader: DataLoader<string, IProfile>;
  referencesLoader: DataLoader<string, IReference[]>;
  avatarsLoader: DataLoader<string, IVisual>;
  tagsetsLoader: DataLoader<string, ITagset[]>;
  locationsLoader: DataLoader<string, ILocation>;
  calloutsLoader: DataLoader<string, ICallout[]>;
  relationsLoader: DataLoader<string, IRelation[]>;
  // add more loders here as you see fit
}
