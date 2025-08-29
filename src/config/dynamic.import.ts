/**
 * Import dynamically ESM modules.
 * using the ability of Javascript to evaluate a function based on a string,
 * so the transpiler cannot touch it. Genius!
 * @usage const module = await dynamicImport('module-name')
 */
export const dynamicImport = new Function(
  'modulePath',
  'return import(modulePath)'
);
