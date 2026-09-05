import type { Config } from 'jest';

const config: Config = {
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/spec/",
    "/dist/"
  ],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    './src/plugin.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    './src/error.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
  rootDir: "./",
  transform: {
    '\\.ts?$': 'babel-jest'
  },
  moduleDirectories: [
    "node_modules",
    "src"
  ],
  moduleNameMapper: {
		'^@ontrackms/nativescript-dotenv$': '<rootDir>/src'
	},
};

export default config;
