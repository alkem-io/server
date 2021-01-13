/* eslint-disable @typescript-eslint/ban-types */
import { Challenge } from '@domain/challenge/challenge.entity';
import { Opportunity } from '@domain/opportunity/opportunity.entity';
import { Project } from '@domain/project/project.entity';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { getRepository } from 'typeorm';

export const IS_UNIQ_TEXT_ID = 'is-uniq-text-id';

export enum TextIdType {
  challenge,
  opportunity,
  project,
}
@ValidatorConstraint({ async: true })
export class IsUniqTextIdConstraint implements ValidatorConstraintInterface {
  validate(textId: any, args: ValidationArguments): boolean | Promise<boolean> {
    const [target] = args.constraints;

    if (target === TextIdType.challenge) {
      const repo = getRepository(Challenge);
      const item = repo.findOne({
        where: { textID: textId },
      });
      return item === undefined;
    } else if (target === TextIdType.opportunity) {
      const repo = getRepository(Opportunity);
      const item = repo.findOne({
        where: { textID: textId },
      });
      return item === undefined;
    } else if (target === TextIdType.project) {
      const repo = getRepository(Project);
      const item = repo.findOne({
        where: { textID: textId },
      });
      return item === undefined;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `TextID '${args.value}' already exists!`;
  }
}

export function IsUniqTextId(
  target: TextIdType,
  validationOptions?: ValidationOptions
) {
  return (object: Object, propertyName: string) =>
    registerDecorator({
      name: IS_UNIQ_TEXT_ID,
      async: true,
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [target],
      validator: IsUniqTextIdConstraint,
    });
}
