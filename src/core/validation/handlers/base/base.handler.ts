/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */

import { CreateActorGroupInput } from '@domain/context/actor-group';
import { CreateAspectInput } from '@domain/context/aspect';
import {
  CreateChallengeInput,
  UpdateChallengeInput,
} from '@domain/challenge/challenge';
import { CreateContextInput } from '@domain/context/context';
import { UpdateEcoverseInput } from '@domain/challenge/ecoverse/dto/ecoverse.dto.update';
import { CreateOrganisationInput } from '@domain/community/organisation';
import { CreateProfileInput } from '@domain/community/profile';
import {
  CreateProjectInput,
  UpdateProjectInput,
} from '@domain/collaboration/project';
import { CreateReferenceInput } from '@domain/common/reference';
import { CreateRelationInput } from '@domain/collaboration/relation';
import { CreateTagsetInput } from '@domain/common/tagset';
import { CreateUserInput, UpdateUserInput } from '@domain/community/user';
import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { validate, ValidationError } from 'class-validator';
import { AbstractHandler } from './abstract.handler';
import { CreateApplicationInput } from '@domain/community/application';
import {
  CreateOpportunityInput,
  UpdateOpportunityInput,
} from '@domain/collaboration/opportunity';
import { UpdateUserGroupInput } from '@domain/community/user-group';

export class BaseHandler extends AbstractHandler {
  public async handle(
    value: any,
    metatype: Function
  ): Promise<ValidationError[]> {
    const types: Function[] = [
      CreateApplicationInput,
      CreateActorGroupInput,
      CreateAspectInput,
      CreateChallengeInput,
      CreateContextInput,
      CreateOpportunityInput,
      CreateOrganisationInput,
      CreateProfileInput,
      CreateProjectInput,
      CreateReferenceInput,
      CreateRelationInput,
      CreateTagsetInput,
      CreateUserInput,
      UpdateEcoverseInput,
      UpdateOpportunityInput,
      UpdateChallengeInput,
      UpdateUserGroupInput,
      UpdateUserInput,
      UpdateProjectInput,
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
