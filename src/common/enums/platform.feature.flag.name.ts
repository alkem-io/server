import { registerEnumType } from '@nestjs/graphql';

export enum PlatformFeatureFlagName {
  COMMUNICATIONS = 'communications',
  COMMUNICATIONS_DISCUSSIONS = 'communications-discussions',
  SUBSCRIPTIONS = 'subscriptions',
  NOTIFICATIONS = 'notifications',
  WHITEBOARDS = 'whiteboards',
  MEMO = 'memo',
  LANDING_PAGE = 'landing-page',
  GUIDENCE_ENGINE = 'guidance-engine',
}

registerEnumType(PlatformFeatureFlagName, {
  name: 'PlatformFeatureFlagName',
});
