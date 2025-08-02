export default {
    clearMocks: true,
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'tests',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            useESM: true
        }]
    },
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    transformIgnorePatterns: [
        'node_modules/(?!(prool|@1inch)/)'
    ],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^prool$': '<rootDir>/prool.js',
        '^prool/(.*)$': '<rootDir>/prool.js'
    },
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    // Increase timeout for anvil server startup
    testTimeout: 30000,
    // Load test environment variables
    setupFiles: ['<rootDir>/jest.env.js']
}