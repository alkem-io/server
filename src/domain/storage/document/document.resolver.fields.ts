import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, LoggerService } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { IDocument } from './document.interface';
import { StorageBucketResolverService } from '@services/infrastructure/entity-resolver/storage.bucket.resolver.service';
import { IJourneyDocumentLocationResult } from './dto/document.result.dto.location';
import { DocumentService } from './document.service';

@Resolver(() => IDocument)
export class DocumentResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private userService: UserService,
    private storageBucketResolverService: StorageBucketResolverService,
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
      return await this.userService.getUserOrFail(createdBy);
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

  @ResolveField('location', () => IJourneyDocumentLocationResult, {
    nullable: false,
    description: 'The location of the storage bucket of this Document',
  })
  async location(
    @Parent() document: IDocument
  ): Promise<IJourneyDocumentLocationResult> {
    const docWithBucket = await this.documentService.getDocumentOrFail(
      document.id,
      {
        relations: ['storageBucket'],
      }
    );
    return this.storageBucketResolverService.getParentJourneyForStorageBucket(
      docWithBucket.storageBucket.id
    );
  }
}
