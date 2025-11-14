import '@testing-library/jest-dom';
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend the Vitest expect instance
expect.extend(matchers);

// No need to redeclare `expect` globally as it is already declared by Jest's type definitions.

// Removed the redeclaration of `expect` as it is already globally declared.

console.log('setupTests.ts executed');
