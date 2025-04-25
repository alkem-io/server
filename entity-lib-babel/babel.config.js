// babel.config.js (located in root/lib)
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: 'current' }, // Adjust targets as needed
        loose: true, // Keep loose mode in preset-env
        // You might need to configure preset-env to *not* include
        // the class properties transform if adding it explicitly causes conflicts.
        // This is often done via includes/excludes in preset-env,
        // but let's try adding the plugin directly first.
      },
    ],
    [
      '@babel/preset-typescript',
      {
        allowDeclareFields: true, // Keep this option
      },
    ],
  ],
  plugins: [
    // Decorators plugin first
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    // Class properties plugin AFTER decorators, with loose mode
    ['@babel/plugin-transform-class-properties', { loose: true }],
    [
      'module-resolver',
      {
        root: ['../src'],
        alias: {
          '@domain': '../src/domain',
          '@library': '../src/library',
          // ... other aliases
        },
      },
    ],
  ],
  include: [
    '../src/**/*.entity.ts',
    // ... other includes
  ],
  ignore: ['**/*.d.ts', '../node_modules'],
};
