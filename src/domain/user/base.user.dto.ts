import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { ProfileInput } from '@domain/profile/profile.dto';

@InputType()
export class BaseUserDto {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(30)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(120)
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(120)
  city?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(120)
  country?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(20)
  gender?: string;

  @IsOptional()
  @Field(() => ProfileInput, { nullable: true })
  profileData?: ProfileInput;
}
