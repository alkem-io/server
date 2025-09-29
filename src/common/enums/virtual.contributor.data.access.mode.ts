import { registerEnumType } from '@nestjs/graphql';

export enum VirtualContributorDataAccessMode {
  NONE = 'none',
  SPACE_PROFILE = 'space_profile',
  SPACE_PROFILE_AND_CONTENTS = 'space_profile_and_contents',
}

registerEnumType(VirtualContributorDataAccessMode, {
  name: 'VirtualContributorDataAccessMode',
});
