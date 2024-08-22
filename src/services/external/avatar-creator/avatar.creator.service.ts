import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import axios, { AxiosResponse } from 'axios';
import { LogContext } from '@common/enums';

@Injectable()
export class AvatarCreatorService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public generateRandomAvatarURL(firstName: string, lastName?: string): string {
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    if (!lastName) {
      return `https://eu.ui-avatars.com/api/?name=${firstName}&background=${randomColor}&color=ffffff&size=200`;
    }
    return `https://eu.ui-avatars.com/api/?name=${firstName}+${lastName}&background=${randomColor}&color=ffffff&size=200`;
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
}
