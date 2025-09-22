/**
 * __mocks__/fileMock.js
 *
 * Simple file mock for Jest tests that import static assets (images, fonts, etc.).
 * Returns a stable string identifier so tests can assert against it or snapshot it.
 *
 * This mock uses CommonJS exports which aligns with Jest's default module resolution.
 */

const FILE_MOCK = 'test-file-stub';

module.exports = FILE_MOCK;
module.exports.default = FILE_MOCK;
