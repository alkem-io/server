import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import { BaseHttpException } from '@common/exceptions/http';
import axios, { AxiosResponse } from 'axios';

export const urlToBuffer = async (imageUrl: string): Promise<Buffer> => {
  try {
    const { data, status }: AxiosResponse<Buffer> = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });

    // Check if the response status is OK
    if (status === 200) {
      return data;
    } else {
      throw new BaseHttpException(
        `Failed to fetch image. Status code: ${status}`,
        status,
        LogContext.DOCUMENT,
        AlkemioErrorStatus.THIRD_PARTY_DOCUMENT_ERROR
      );
    }
  } catch (error: any) {
    throw new BaseException(
      `Error fetching or processing the image: ${error.message}`,
      LogContext.DOCUMENT,
      AlkemioErrorStatus.THIRD_PARTY_DOCUMENT_ERROR
    );
  }
};
