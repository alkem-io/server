import { Field, ObjectType } from '@nestjs/graphql';
import { FeatureFlag } from './platform.dto.feature.flag';

@ObjectType('PlatformLocations')
export abstract class IPlatformLocations {
  @Field(() => String, {
    nullable: false,
    description: 'Main domain of the environment',
  })
  domain!: string;

  @Field(() => String, {
    nullable: false,
    description: 'Name of the environment',
  })
  environment!: string;

  @Field(() => String, {
    nullable: false,
    description: 'URL to the terms of usage for the platform',
  })
  terms!: string;

  @Field(() => String, {
    nullable: false,
    description: 'URL to the privacy policy for the platform',
  })
  privacy!: string;

  @Field(() => String, {
    nullable: false,
    description: 'URL to the security policy for the platform',
  })
  security!: string;

  @Field(() => String, {
    nullable: false,
    description: 'URL to a form for providing feedback',
  })
  feedback!: string;

  @Field(() => String, {
    nullable: false,
    description: 'URL to a page about the platform',
  })
  about!: string;

  @Field(() => String, {
    nullable: false,
    description: 'URL for the link Impact in the HomePage of the application',
  })
  impact!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'URL for the link Foundation in the HomePage of the application',
  })
  foundation!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'URL for the link Opensource in the HomePage of the application',
  })
  opensource!: string;

  @Field(() => String, {
    nullable: false,
    description: 'URL where users can get support for the platform',
  })
  support!: string;

  @Field(() => String, {
    nullable: false,
    description: 'URL where users can get information about previous releases',
  })
  releases!: string;

  @Field(() => [FeatureFlag], {
    nullable: false,
    description: 'The feature flags for the platform',
  })
  featureFlags?: FeatureFlag[];

  @Field(() => String, {
    nullable: false,
    description: 'URL where users can get help',
  })
  help!: string;

  @Field(() => String, {
    nullable: false,
    description: 'URL where users can see the community forum',
  })
  community!: string;

  @Field(() => String, {
    nullable: false,
    description: 'URL where new users can get onboarding help',
  })
  newuser!: string;

  @Field(() => String, {
    nullable: false,
    description: 'URL where users can get tips and tricks',
  })
  tips!: string;

  @Field(() => String, {
    nullable: false,
    description: 'URL where users can get tips and tricks',
  })
  aup!: string;
}
