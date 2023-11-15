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
      throw new Error(`Failed to fetch image. Status code: ${status}`);
    }
  } catch (error: any) {
    throw new Error(`Error fetching or processing the image: ${error.message}`);
  }
};
