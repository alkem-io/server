import { registerEnumType } from '@nestjs/graphql';

export enum AiPersonaDataAccessMode {
  NONE = 'none',
  SPACE_PROFILE = 'space_profile',
  SPACE_PROFILE_AND_CONTENTS = 'space_profile_and_contents',
}

registerEnumType(AiPersonaDataAccessMode, {
  name: 'AiPersonaDataAccessMode',
});
