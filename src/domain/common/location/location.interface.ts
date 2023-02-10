import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseAlkemio } from '../entity/base-entity/base.alkemio.interface';

@ObjectType('Location')
export abstract class ILocation extends IBaseAlkemio {
  @Field(() => String)
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
