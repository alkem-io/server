import { ConfigurationTypes, LogContext } from '@common/enums';
import { streamToBuffer } from '@common/utils';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { ReadStream } from 'fs';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CID, create, IPFSHTTPClient } from 'ipfs-http-client';
import { IpfsDeleteFailedException } from '@common/exceptions/ipfs/ipfs.delete.exception';
import { IpfsGCFailedException } from '@common/exceptions/ipfs/ipfs.gc.exception';

@Injectable()
export class IpfsService {
  private readonly ipfsClient: IPFSHTTPClient;
  private readonly ipfsClientEndpoint;

  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    const ipfsEndpoint = this.configService.get(ConfigurationTypes.STORAGE)
      ?.ipfs?.endpoint;
    this.ipfsClientEndpoint = this.configService.get(
      ConfigurationTypes.STORAGE
    )?.ipfs?.client_endpoint;
    this.ipfsClient = create({ url: ipfsEndpoint });
  }

  public async uploadFile(filePath: string): Promise<string> {
    this.logger.verbose?.(
      `Uploading file from path: ${filePath}`,
      LogContext.IPFS
    );
    const imageBuffer = fs.readFileSync(filePath);
    return this.uploadFileFromBuffer(imageBuffer);
  }

  public async uploadFileFromStream(stream: ReadStream): Promise<string> {
    const buffer = await streamToBuffer(stream);
    return await this.uploadFileFromBuffer(buffer);
  }

  public async uploadFileFromBuffer(buffer: Buffer): Promise<string> {
    const CID = await this.uploadFileFromBufferCID(buffer);
    return this.createIpfsClientEndPoint(CID);
  }

  // returns the CID only
  public async uploadFileFromBufferCID(buffer: Buffer): Promise<string> {
    const res = await this.ipfsClient.add(buffer, { pin: true });
    this.logger.verbose?.(
      `Uploaded file with CID: ${res.path}`,
      LogContext.IPFS
    );
    return res.path;
  }

  public createIpfsClientEndPoint(CID: string): string {
    return `${this.ipfsClientEndpoint}/${CID}`;
  }

  // Returns the CID that was uploaded
  public async Raw(buffer: Buffer): Promise<string> {
    const res = await this.ipfsClient.add(buffer, { pin: true });
    this.logger.verbose?.(
      `Uploaded file with CID: ${res.path}`,
      LogContext.IPFS
    );
    return `${res.path}`;
  }

  public async unpinFile(CID: string): Promise<CID> {
    this.logger.verbose?.(`Unpinning file from CID: ${CID}`, LogContext.IPFS);

    try {
      return this.ipfsClient.pin.rm(CID);
    } catch (error: any) {
      this.logger.error('Unpinning failed', LogContext.IPFS);
      throw new IpfsDeleteFailedException(`Unpinning failed ${error.message}`);
    }
  }

  public async garbageCollect(): Promise<boolean> {
    this.logger.verbose?.('Garbage collection started!', LogContext.IPFS);
    try {
      for await (const gcFile of this.ipfsClient.repo.gc()) {
        this.logger.verbose?.(
          `Garbage collected ${gcFile.cid}`,
          LogContext.IPFS
        );

        if (gcFile.err) {
          this.logger.error(
            `Error in collection ${gcFile.err}`,
            LogContext.IPFS
          );
        }
      }
    } catch (error: any) {
      this.logger.error('Garbage collection failed', LogContext.IPFS);
      throw new IpfsGCFailedException(
        `Garbage collection failed ${error.message}`
      );
    }
    return true;
  }
}
