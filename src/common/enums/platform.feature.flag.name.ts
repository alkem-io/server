import { registerEnumType } from '@nestjs/graphql';

export enum PlatformFeatureFlagName {
  SSI = 'ssi',
  COMMUNICATIONS = 'communications',
  COMMUNICATIONS_DISCUSSIONS = 'communications-discussions',
  SUBSCRIPTIONS = 'subscriptions',
  NOTIFICATIONS = 'notifications',
  WHITEBOARDS = 'whiteboards',
  LANDING_PAGE = 'landing-page',
  GUIDENCE_ENGINE = 'guidance-engine',
}

registerEnumType(PlatformFeatureFlagName, {
  name: 'PlatformFeatureFlagName',
});
