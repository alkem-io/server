/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */

import { CreateActorGroupInput } from '@domain/context/actor-group';
import { CreateAspectInput } from '@domain/context/aspect';
import { CreateChallengeInput } from '@domain/challenge/challenge';
import { CreateContextInput } from '@domain/context/context';
import { UpdateEcoverseInput } from '@domain/challenge/ecoverse';
import { CreateOrganisationInput } from '@domain/community/organisation';
import { CreateProfileInput } from '@domain/community/profile';
import { CreateProjectInput } from '@domain/collaboration/project';
import { CreateReferenceInput } from '@domain/common/reference';
import { CreateRelationInput } from '@domain/collaboration/relation';
import { CreateTagsetInput } from '@domain/common/tagset';
import { CreateUserInput } from '@domain/community/user';
import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { validate, ValidationError } from 'class-validator';
import { AbstractHandler } from './abstract.handler';

export class BaseHandler extends AbstractHandler {
  public async handle(
    value: any,
    metatype: Function
  ): Promise<ValidationError[]> {
    const types: Function[] = [
      CreateActorGroupInput,
      CreateAspectInput,
      CreateChallengeInput,
      CreateContextInput,
      UpdateEcoverseInput,
      CreateOrganisationInput,
      CreateProfileInput,
      CreateProjectInput,
      CreateReferenceInput,
      CreateRelationInput,
      CreateTagsetInput,
      CreateUserInput,
    ];

    if (types.includes(metatype)) {
      const errors = await validate(value);
      if (errors.length > 0) {
        throw new ValidationException(
          `DTO validation for ${metatype} failed! ${errors}`,
          LogContext.API
        );
      }
    }
    return super.handle(value, metatype);
  }
}
