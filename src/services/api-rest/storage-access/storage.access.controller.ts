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
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';
import { promises as fs } from 'fs';
import { finished } from 'stream';
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
  ): Promise<StreamableFile> {
    const document = await this.documentService.getDocumentOrFail(id);

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      document.authorization,
      AuthorizationPrivilege.READ,
      `Read document: ${document.displayName}`
    );

    res.setHeader('Content-Type', `${document.mimeType}`);
    await this.documentService.getDocumentContents(document);

    const tempFilePath = join(process.cwd(), document.displayName);
    const file = createReadStream(tempFilePath);
    // Add the callback when the stream ends
    finished(file, async err => {
      if (err) {
        this.logger.error(
          `An error occurred while streaming the file:: ${document.displayName}`,
          LogContext.STORAGE_ACCESS
        );
      } else {
        // Delete the file
        await fs.unlink(tempFilePath);
        this.logger.verbose?.(
          `The file has been streamed and temp file cleaned up successfully.:: ${document.displayName}`,
          LogContext.STORAGE_ACCESS
        );
      }
    });
    return new StreamableFile(file);
  }
}
