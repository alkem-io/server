import DataLoader from 'dataloader';
import { ILocation } from '@domain/common/location/location.interface';
import { IReference } from '@domain/common/reference/reference.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { IProfile } from '@domain/community/profile/profile.interface';
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

