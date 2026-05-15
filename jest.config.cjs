/** @type {import('ts-jest').JestConfigWithTsJest} */
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  setupFiles: ['dotenv/config'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    ...(compilerOptions.paths
      ? pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' })
      : {}),
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};
