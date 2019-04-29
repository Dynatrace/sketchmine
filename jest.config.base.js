module.exports = {
  verbose: true,
  testEnvironment: 'node',
  testURL: 'http://localhost/',
  testPathIgnorePatterns: ['lib/', 'node_modules', 'fixtures'],
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  testRegex: "(/(tests|src)/.*.(test|e2e)).ts$",
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
};
