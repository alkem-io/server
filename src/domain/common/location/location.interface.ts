import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseAlkemio } from '../entity/base-entity/base.alkemio.interface';

@ObjectType('Location')
export abstract class ILocation extends IBaseAlkemio {
  // todo: match entity
  @Field(() => String, {
    nullable: true,
    description: 'City of the location.',
  })
  city!: string;

  @Field(() => String)
  country!: string;

  @Field(() => String)
  addressLine1!: string;

  @Field(() => String)
  addressLine2!: string;

  @Field(() => String)
  stateOrProvince!: string;

  @Field(() => String)
  postalCode!: string;
}
