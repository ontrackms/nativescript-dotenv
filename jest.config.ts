import type { Config } from 'jest';

const config: Config = {
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/spec/",
    "/dist/"
  ],
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
