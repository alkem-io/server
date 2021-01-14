/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */

import { ActorGroupInput } from '@domain/actor-group/actor-group.dto';
import { AspectInput } from '@domain/aspect/aspect.dto';
import { ChallengeInput } from '@domain/challenge/challenge.dto';
import { ContextInput } from '@domain/context/context.dto';
import { EcoverseInput } from '@domain/ecoverse/ecoverse.dto';
import { OrganisationInput } from '@domain/organisation/organisation.dto';
import { ProfileInput } from '@domain/profile/profile.dto';
import { ProjectInput } from '@domain/project/project.dto';
import { ReferenceInput } from '@domain/reference/reference.dto';
import { RelationInput } from '@domain/relation/relation.dto';
import { TagsetInput } from '@domain/tagset/tagset.dto';
import { UserInput } from '@domain/user/user.dto';
import { ValidationException } from '@utils/error-handling/exceptions';
import { LogContext } from '@utils/logging/logging.contexts';
import { validate, ValidationError } from 'class-validator';
import { AbstractHandler } from './abstract.handler';

export class BaseHandler extends AbstractHandler {
  public async handle(
    value: any,
    metatype: Function
  ): Promise<ValidationError[]> {
    const types: Function[] = [
      ActorGroupInput,
      AspectInput,
      ChallengeInput,
      ContextInput,
      EcoverseInput,
      OrganisationInput,
      ProfileInput,
      ProjectInput,
      ReferenceInput,
      RelationInput,
      TagsetInput,
      UserInput,
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
