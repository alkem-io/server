/* eslint-disable @typescript-eslint/ban-types */
import { ChallengeService } from '@domain/challenge/challenge.service';
import { Opportunity } from '@domain/opportunity/opportunity.entity';
import { OpportunityService } from '@domain/opportunity/opportunity.service';
import { Project } from '@domain/project/project.entity';
import { ProjectService } from '@domain/project/project.service';
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
export class IsUniqueTextIdConstraint implements ValidatorConstraintInterface {
  constructor(
    protected readonly challengeService: ChallengeService,
    protected readonly opportunityService: OpportunityService,
    protected readonly projectService: ProjectService
  ) {}

  validate(textId: any, args: ValidationArguments): boolean | Promise<boolean> {
    const [target] = args.constraints;

    if (target === TextIdType.challenge) {
      this.challengeService.getChallengeByID;
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

export function IsUniqueTextId(
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
      validator: IsUniqueTextIdConstraint,
    });
}
