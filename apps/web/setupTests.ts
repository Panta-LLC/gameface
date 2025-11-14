import '@testing-library/jest-dom';
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend the Vitest expect instance
expect.extend(matchers);

// Declare a global type for `expect`
declare global {
  var expect: typeof import('vitest').expect;
}

// Set the extended expect instance globally
globalThis.expect = expect;

console.log('setupTests.ts executed');
