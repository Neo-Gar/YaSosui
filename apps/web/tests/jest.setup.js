// Jest setup file for ES module support
const { TextEncoder, TextDecoder } = require("util");

global.TextEncoder = TextEncoder;
// @ts-ignore
global.TextDecoder = TextDecoder;

// Mock import.meta for packages that use it
// @ts-ignore
global.import = {
  meta: {
    url: "file://" + process.cwd() + "/tests/",
    // @ts-ignore
    resolve: (specifier) => {
      // Simple mock implementation
      return "file://" + process.cwd() + "/node_modules/" + specifier;
    },
  },
};
