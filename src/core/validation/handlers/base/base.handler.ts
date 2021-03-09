/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */

import { ActorGroupInput } from '@domain/context/actor-group/actor-group.dto';
import { AspectInput } from '@domain/context/aspect/aspect.dto';
import { ChallengeInput } from '@domain/challenge/challenge/challenge.dto';
import { ContextInput } from '@domain/context/context/context.dto';
import { EcoverseInput } from '@domain/challenge/ecoverse/ecoverse.dto';
import { OrganisationInput } from '@domain/community/organisation/organisation.dto';
import { ProfileInput } from '@domain/community/profile/profile.dto';
import { ProjectInput } from '@domain/collaboration/project/project.dto';
import { ReferenceInput } from '@domain/common/reference/reference.dto';
import { RelationInput } from '@domain/collaboration/relation/relation.dto';
import { TagsetInput } from '@domain/common/tagset/tagset.dto';
import { UserInput } from '@domain/community/user/user.dto';
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
