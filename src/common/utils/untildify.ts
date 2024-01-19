import os from 'os';

const homeDir = os.homedir();

/***
 * @description: Replaces '~' at the start of the path and following '/' or '\' with home
 * @param {string} path
 * @return {string} path
 */
export const untildify = (path: string): string => {
  return homeDir ? path.replace(/^~(?=$|\/|\\)/, homeDir) : path;
};
