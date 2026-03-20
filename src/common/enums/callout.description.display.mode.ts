import { registerEnumType } from '@nestjs/graphql';

export enum CalloutDescriptionDisplayMode {
  COLLAPSED = 'collapsed',
  EXPANDED = 'expanded',
}

registerEnumType(CalloutDescriptionDisplayMode, {
  name: 'CalloutDescriptionDisplayMode',
});
