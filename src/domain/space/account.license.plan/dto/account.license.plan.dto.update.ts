import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, Min } from 'class-validator';

@InputType()
export class UpdateAccountLicensePlanInput {
  @Field(() => Int, {
    nullable: true,
    description: 'The number of Free Spaces allowed.',
  })
  @IsOptional()
  @IsInt({ message: 'spaceFree must be an integer' })
  @Min(0, { message: 'spaceFree must be a non-negative integer' })
  spaceFree?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'The number of Plus Spaces allowed.',
  })
  @IsOptional()
  @IsInt({ message: 'spacePlus must be an integer' })
  @Min(0, { message: 'spacePlus must be a non-negative integer' })
  spacePlus?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'The number of Premium Spaces allowed.',
  })
  @IsOptional()
  @IsInt({ message: 'spacePremium must be an integer' })
  @Min(0, { message: 'spacePremium must be a non-negative integer' })
  spacePremium?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'The number of Virtual Contributors allowed.',
  })
  @IsOptional()
  @IsInt({ message: 'virtualContributor must be an integer' })
  @Min(0, { message: 'virtualContributor must be a non-negative integer' })
  virtualContributor?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'The number of Innovation Packs allowed.',
  })
  @IsOptional()
  @IsInt({ message: 'innovationPacks must be an integer' })
  @Min(0, { message: 'innovationPacks must be a non-negative integer' })
  innovationPacks?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'The number of Starting Pages allowed.',
  })
  @IsOptional()
  @IsInt({ message: 'startingPages must be an integer' })
  @Min(0, { message: 'startingPages must be a non-negative integer' })
  startingPages?: number;
}
