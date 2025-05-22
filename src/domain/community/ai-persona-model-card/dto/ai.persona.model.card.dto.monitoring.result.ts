import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ModelCardMonitoringResult {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Since Alkemio facilitates the interaction with the external provider, it holds an operational responsibility to monitor the service. As with all data and interactions on the platform, these are governed by our <a href="https://welcome.alkem.io/legal/#tc" target="_blank" ref="noreferer">Terms & Conditions</a>.',
  })
  isUsageMonitoredByAlkemio!: boolean;
}
