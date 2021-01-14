/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { UserService } from '@domain/user/user.service';
import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isUserAlreadyExist', async: true })
@Injectable() // this is needed in order to the class be injected into the module
export class IsUserAlreadyExistConstraint
  implements ValidatorConstraintInterface {
  constructor(protected readonly usersService: UserService) {}

  async validate(email: any, args: ValidationArguments) {
    const user = await this.usersService.getUserByEmail(email);
    if (user) return false;
    return true;
  }
}

export function IsUserAlreadyExist(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUserAlreadyExistConstraint,
    });
  };
}
