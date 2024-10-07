import fetch from 'node-fetch';

export const bufferFromUrl = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }

  return response.buffer();
};
