import { registerEnumType } from '@nestjs/graphql';

export enum AiPersonaAccessMode {
  NONE = 'none',
  SPACE_PROFILE = 'space_profile',
  SPACE_PROFILE_AND_CONTENTS = 'space_profile_and_contents',
}

registerEnumType(AiPersonaAccessMode, {
  name: 'AiPersonaAccessMode',
});
