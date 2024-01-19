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
      this.authorizationService.grantAccessOrFail(
        agentInfo,
        document.authorization,
        AuthorizationPrivilege.READ,
        `Read document: ${document.displayName} - '${document.id}`
      );
    } catch (e: any) {
      this.logger.error(e, e?.stack, LogContext.DOCUMENT);
      const docWithInfo = await this.documentService.getDocumentOrFail(id, {
        relations: {
          storageBucket: true,
        },
      });
      this.logger.error(
        `User '${agentInfo.userID}' - unable to access document '${docWithInfo.id} in storage bucket '${docWithInfo.storageBucket.id}: ${e?.message}`,
        e?.stack,
        LogContext.DOCUMENT
      );

      throw new ForbiddenHttpException(
        `Authorization policy for document '${docWithInfo.id}' not sufficient`,
        LogContext.DOCUMENT
      );
    }

    res.setHeader('Content-Type', `${document.mimeType}`);

    // Set caching headers
    res.setHeader('Cache-Control', 'public, max-age=15552000');
    res.setHeader('Pragma', 'public');
    res.setHeader(
      'Expires',
      new Date(Date.now() + 15552000 * 1000).toUTCString()
    );

    try {
      const readable = await this.documentService.getDocumentContents(document);
      return new StreamableFile(readable);
    } catch (e: any) {
      this.logger.error(
        `Error while trying to retrieve document '${id}': ${e}`,
        e?.stack,
        LogContext.DOCUMENT
      );
      throw new NotFoundHttpException(
        'Error while trying to retrieve document',
        LogContext.DOCUMENT
      );
    }
  }
}
