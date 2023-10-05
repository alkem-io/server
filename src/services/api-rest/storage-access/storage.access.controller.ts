import {
  Controller,
  Get,
  Inject,
  LoggerService,
  Param,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GraphQLError } from 'graphql';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { RestGuard } from '@core/authorization/rest.guard';
import { DocumentService } from '@domain/storage/document/document.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  ForbiddenHttpException,
  NotFoundHttpException,
} from '@common/exceptions/http';
import type { Response } from 'express';

@Controller('/rest/storage')
export class StorageAccessController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly documentService: DocumentService,
    private readonly authorizationService: AuthorizationService
  ) {}

  @UseGuards(RestGuard)
  @Get('document/:id')
  async document(
    @CurrentUser() agentInfo: AgentInfo,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile | void> {
    let document;
    try {
      document = await this.documentService.getDocumentOrFail(id);
    } catch (e) {
      throw new NotFoundHttpException(
        `Document with id '${id}' not found`,
        LogContext.DOCUMENT
      );
    }

    try {
      await this.authorizationService.grantAccessOrFail(
        agentInfo,
        document.authorization,
        AuthorizationPrivilege.READ,
        `Read document: ${document.displayName} - '${document.id}`
      );
    } catch (e: unknown) {
      try {
        document = await this.documentService.getDocumentOrFail(id, {
          relations: {
            storageBucket: true,
          },
        });
        this.logger.error(
          `User '${agentInfo}' - unable to access document '${document.id} in storage bucked '${document.storageBucket.id}`,
          LogContext.DOCUMENT
        );
      } catch (e) {
        throw new NotFoundHttpException(
          `Document with id '${id}' not found`,
          LogContext.DOCUMENT
        );
      }
      const err = e as GraphQLError;
      throw new ForbiddenHttpException(err.message, LogContext.DOCUMENT);
    }

    res.setHeader('Content-Type', `${document.mimeType}`);

    // Set caching headers
    res.setHeader('Cache-Control', 'public, max-age=15552000');
    res.setHeader('Pragma', 'public');
    res.setHeader(
      'Expires',
      new Date(Date.now() + 15552000 * 1000).toUTCString()
    );

    const readable = this.documentService.getDocumentContents(document);
    return new StreamableFile(readable);
  }
}
