/**
 * Import dynamically ESM modules.
 * using the ability of Javascript to evaluate a function based on a string,
 * so the transpiler cannot touch it. Genius!
 * @usage const module = await dynamicImport('module-name')
 * @security Do not pass untrusted/user-controlled input as modulePath.
 */
export const dynamicImport: <T = unknown>(modulePath: string) => Promise<T> =
  new Function('modulePath', 'return import(modulePath)') as any;
