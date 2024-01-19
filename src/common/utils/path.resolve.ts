import pathLib from 'path';
import { untildify } from './untildify';

export const pathResolve = (path: string) => {
  // resolve missing path to the current working directory
  if (!path) {
    return process.cwd();
  }
  // return absolute paths
  if (pathLib.isAbsolute(path)) {
    return path;
  }
  // resolve the cases where ~ was used
  if (path.startsWith('~')) {
    return untildify(path);
  }
  // resolve relative paths to the current working directory
  return pathLib.resolve(process.cwd(), path);
};
