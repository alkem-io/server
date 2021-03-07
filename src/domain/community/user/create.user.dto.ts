import { Field, InputType } from '@nestjs/graphql';
import { IsUserAlreadyExist } from '@src/core/validation/constraints/user.exists.constraint';
import { IsEmail, MaxLength } from 'class-validator';
import { BaseUserDto } from './base.user.dto';

@InputType()
export class CreateUserDto extends BaseUserDto {
  @Field({ nullable: false })
  @MaxLength(50)
  accountUpn!: string;

  @Field({ nullable: false })
  @MaxLength(60)
  firstName!: string;

  @Field({ nullable: false })
  @MaxLength(60)
  lastName!: string;

  @IsUserAlreadyExist()
  @Field({
    nullable: false,
    description: 'Email address is required for mutations!',
  })
  @IsEmail()
  email!: string;

  @Field({ nullable: false })
  @MaxLength(30)
  aadPassword!: string;
}
