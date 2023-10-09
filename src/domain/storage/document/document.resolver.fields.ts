import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, LoggerService } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { IUser } from '@domain/community/user/user.interface';
import { IDocument } from './document.interface';
import { DocumentService } from './document.service';
import { UserLookupService } from '@services/infrastructure/user-lookup/user.lookup.service';

@Resolver(() => IDocument)
export class DocumentResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private userLookupService: UserLookupService,
    private documentService: DocumentService
  ) {}

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this Document',
  })
  async createdBy(@Parent() document: IDocument): Promise<IUser | null> {
    const createdBy = document.createdBy;
    if (!createdBy) {
      return null;
    }

    try {
      return await this.userLookupService.getUserByUUID(createdBy);
    } catch (e: unknown) {
      if (e instanceof EntityNotFoundException) {
        this.logger?.warn(
          `createdBy '${createdBy}' unable to be resolved when resolving storage document '${document.id}'`,
          LogContext.CALENDAR
        );
        return null;
      } else {
        throw e;
      }
    }
  }

  @ResolveField('uploadedDate', () => Date, {
    nullable: false,
    description: 'The uploaded date of this Document',
  })
  async uploadedDate(@Parent() document: IDocument): Promise<Date> {
    return this.documentService.getUploadedDate(document.id);
  }

  @ResolveField('url', () => String, {
    nullable: false,
    description: 'The URL to be used to retrieve the Document',
  })
  async url(@Parent() document: IDocument): Promise<string> {
    return this.documentService.getPubliclyAccessibleURL(document);
  }
}
