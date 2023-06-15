import type {Config} from 'jest';

const config: Config = {
  transform: {
    '\\.ts?$': 'babel-jest'
  },
  rootDir: "./",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/spec/"
  ],
  moduleDirectories: [
    "node_modules",
    "src"
  ]
};

export default config;

// "jest": {
//   "rootDir": "./",
//   "coveragePathIgnorePatterns": [
//     "/node_modules/",
//     "/spec/"
//   ],
//   "moduleDirectories": [
//     "node_modules",
//     "src"
//   ]
// },clear
