import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Geo')
export abstract class IGeoConfig {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Is the geo functionality enabled.',
  })
  enabled!: boolean;

  @Field(() => String, {
    nullable: false,
    description: 'Endpoint where geo information is consumed from.',
  })
  endpoint!: string;
}
