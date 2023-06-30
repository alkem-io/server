import {
  BadRequestException,
  Controller,
  Get, HttpCode, HttpException, HttpStatus,
  Inject,
  LoggerService,
  Param,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { Response } from 'express';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPrivilege } from '@common/enums';
import { RestGuard } from '@core/authorization/rest.guard';
import { DocumentService } from '@domain/storage/document/document.service';
import { AuthorizationService } from '@core/authorization/authorization.service';

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
  @HttpCode(HttpStatus.OK)
  @HttpCode(HttpStatus.NOT_FOUND)
  @HttpCode(HttpStatus.FORBIDDEN)
  async document(
    @CurrentUser() agentInfo: AgentInfo,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile | void> {
    const document = await this.documentService.getDocumentOrFail(id);

    const result = await this.authorizationService.grantAccessOrFail(
      agentInfo,
      document.authorization,
      AuthorizationPrivilege.READ,
      `Read document: ${document.displayName}`
    );

    // try {
    //   await this.authorizationService.grantAccessOrFail(
    //     agentInfo,
    //     document.authorization,
    //     AuthorizationPrivilege.READ,
    //     `Read document: ${document.displayName}`
    //   );
    // } catch (e: any) {
    //   // throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    //   // throw new BadRequestException(e);
    //   return;
    // }

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
