import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import axios, { AxiosResponse } from 'axios';

@Injectable()
export class AvatarCreatorService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public generateRandomAvatarURL(firstName: string, lastName?: string): string {
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    if (!lastName) {
      return `https://eu.ui-avatars.com/api/?name=${firstName}&background=${randomColor}&color=ffffff`;
    }
    return `https://eu.ui-avatars.com/api/?name=${firstName}+${lastName}&background=${randomColor}&color=ffffff`;
  }

  public async urlToBuffer(imageUrl: string): Promise<Buffer> {
    try {
      const { data, status }: AxiosResponse<Buffer> = await axios.get(
        imageUrl,
        {
          responseType: 'arraybuffer',
        }
      );

      // Check if the response status is OK
      if (status === 200) {
        return data;
      } else {
        throw new Error(`Failed to fetch image. Status code: ${status}`);
      }
    } catch (error: any) {
      throw new Error(
        `Error fetching or processing the image: ${error.message}`
      );
    }
  }
}
