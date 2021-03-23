import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { ProfileInput } from '@domain/community/profile/profile.dto';
import { BaseUserDto } from './base.user.dto';

@InputType()
export class UpdateUserDto extends BaseUserDto {
  @Field({ nullable: false })
  @MaxLength(50)
  ID!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(30)
  aadPassword?: string;

  @Field(() => ProfileInput, { nullable: true })
  @IsOptional()
  profileData?: ProfileInput;
}
