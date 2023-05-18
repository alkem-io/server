import { Field, InterfaceType } from '@nestjs/graphql';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums/logging.context';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { DocumentLocationResultType } from '@common/enums/document.location.result.type';
import { IOrganization } from '@domain/community/organization';
import { IPlatform } from '@platform/platfrom/platform.interface';
import { IUser } from '@domain/community/user';

@InterfaceType('IDocumentResult', {
  resolveType(documentResult) {
    const type = documentResult.type;
    switch (type) {
      case DocumentLocationResultType.HUB:
        return IHub;
      case DocumentLocationResultType.CHALLENGE:
        return IChallenge;
      case DocumentLocationResultType.ORGANIZATION:
        return IOrganization;
      case DocumentLocationResultType.PLATFORM:
        return IPlatform;
      case DocumentLocationResultType.USER:
        return IUser;
    }

    throw new RelationshipNotFoundException(
      `Unable to determine document result type for ${documentResult.id}: ${type}`,
      LogContext.SEARCH
    );
  },
})
export abstract class IDocumentLocationResult {
  @Field(() => DocumentLocationResultType, {
    nullable: false,
    description: 'The Document location type (Parent) for this Storage Bucket.',
  })
  type!: string;
}
