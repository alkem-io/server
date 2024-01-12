import { ConfigurationTypes, LogContext } from '@common/enums';
import { streamToBuffer } from '@common/utils';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReadStream } from 'fs';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
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
    const timeout = this.configService.get(ConfigurationTypes.STORAGE)?.ipfs
      ?.timeout;
    this.ipfsClient = create({ url: ipfsEndpoint, timeout });
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

  public getFileContents(CID: string): AsyncIterable<Uint8Array> | never {
    return this.ipfsClient.cat(CID);
  }

  private async cidExists(cidID: string): Promise<boolean> {
    try {
      const cidObj = CID.parse(cidID);
      await this.ipfsClient.dag.get(cidObj, { timeout: 100 });
      return true;
    } catch (error: any) {
      this.logger.error(
        `IPFS file with CID: ${cidID} does not exist in this IPFS instance!`,
        error?.stack,
        LogContext.IPFS
      );
    }

    return false;
  }

  public async getBufferByCID(CID: string): Promise<Buffer | null> {
    const chunks = [];

    const exists = await this.cidExists(CID);
    if (!exists) return null;
    for await (const chunk of this.ipfsClient.cat(CID)) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  public createIpfsClientEndPoint(CID: string): string {
    return `${this.ipfsClientEndpoint}/${CID}`;
  }

  public unpinFile(CID: string): Promise<CID> {
    this.logger.verbose?.(`Unpinning file from CID: ${CID}`, LogContext.IPFS);

    try {
      return this.ipfsClient.pin.rm(CID);
    } catch (error: any) {
      this.logger.error('Unpinning failed', error?.stack, LogContext.IPFS);
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
            gcFile.err.stack,
            LogContext.IPFS
          );
        }
      }
    } catch (error: any) {
      this.logger.error(
        'Garbage collection failed',
        error?.stack,
        LogContext.IPFS
      );
      throw new IpfsGCFailedException(
        `Garbage collection failed ${error.message}`
      );
    }
    return true;
  }
}
