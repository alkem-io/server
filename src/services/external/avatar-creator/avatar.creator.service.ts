import { LogContext } from '@common/enums';
import { MimeFileType } from '@common/enums/mime.file.type';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import replaceSpecialCharacters from 'replace-special-characters';

export const DEFAULT_AVATAR_SERVICE_URL = 'https://eu.ui-avatars.com/api/';
@Injectable()
export class AvatarCreatorService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public generateRandomAvatarURL(firstName: string, lastName?: string): string {
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    const size = 200;
    if (!lastName) {
      const lastNameNoSpecialCharacters =
        this.removeSpecialCharacters(firstName);
      return `${DEFAULT_AVATAR_SERVICE_URL}?name=${lastNameNoSpecialCharacters}&background=${randomColor}&color=ffffff&size=${size}`;
    }
    const firstNameNoSpecialCharacters =
      this.removeSpecialCharacters(firstName);
    const lastNameNoSpecialCharacters = this.removeSpecialCharacters(lastName);
    return `${DEFAULT_AVATAR_SERVICE_URL}?name=${firstNameNoSpecialCharacters}+${lastNameNoSpecialCharacters}&background=${randomColor}&color=ffffff&size=${size}`;
  }

  private removeSpecialCharacters(base: string): string {
    // only allow alphanumeric characters and hyphens
    const nameIDExcludedCharacters = /[^a-zA-Z0-9-]/g;
    // replace characters with umlouts etc. to normal characters
    const noSpecialCharacters: string = replaceSpecialCharacters(base)
      // remove all unwanted characters (consult regex for allowed characters)
      .replace(nameIDExcludedCharacters, '')
      .toLowerCase();
    return noSpecialCharacters;
  }

  public async urlToBuffer(imageUrl: string): Promise<Buffer> {
    this.logger.verbose?.(
      `Retrieving external image from URL: ${imageUrl}`,
      LogContext.USER
    );
    try {
      const { data, status }: AxiosResponse<Buffer> = await axios.get(
        imageUrl,
        {
          responseType: 'arraybuffer',
        }
      );

      // Check if the response status is OK
      if (status === 200) {
        this.logger.verbose?.(
          `...image retrieved from: ${imageUrl}`,
          LogContext.USER
        );
        return data;
      } else {
        throw new Error(
          `Failed to fetch image using URL ${imageUrl}. Status code: ${status}`
        );
      }
    } catch (error: any) {
      throw new Error(
        `Error fetching or processing the image at URL ${imageUrl}: ${error.message}`
      );
    }
  }

  public async getFileType(imageBuffer: Buffer): Promise<string | undefined> {
    this.logger.verbose?.(
      `Not determining file type from buffer: ${imageBuffer.byteLength}, using hard coded PNG response`,
      LogContext.COMMUNITY
    );
    // TODO: implement proper file type detection based on the buffer contents.
    // However the package 'file-type' is causing issues with the CS Common package setup
    // https://github.com/alkem-io/server/issues/4459
    // Dynamic import required to avoid CS Common require issue
    // const { fileTypeFromBuffer } = await import('file-type');
    // const fileInfo = await fileTypeFromBuffer(imageBuffer);
    // return fileInfo?.mime;
    return MimeFileType.PNG;
  }
}
