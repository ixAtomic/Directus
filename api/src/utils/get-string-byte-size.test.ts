import { stringByteSize } from '../../src/utils/get-string-byte-size';
import { test, expect } from 'vitest';

test('Returns correct byte size for given input string', () => {
	expect(stringByteSize('test')).toBe(4);
	expect(stringByteSize('๐ก')).toBe(4);
	expect(stringByteSize('๐จโ๐งโ๐ฆ')).toBe(18);
});
