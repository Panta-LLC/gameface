import { expect, test } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

console.log('Minimal setupTests.ts executed');
