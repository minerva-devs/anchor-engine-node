/**
 * Search Utils Test (P0 - Critical)
 * Tests tag footer stripping - core to search output quality
 */

import { describe, it, assert } from '../minimal-framework.mjs';
// Note: This test uses a regex pattern from search-utils.ts

const stripTagFootersPattern = /^(##[A-Za-z0-9_]*\s*)+$/;

describe('Search Utils', () => {
  it('should match YAML footer lines with single tag tokens', () => {
    assert(stripTagFootersPattern.test('##19864Residential'), 'Single token');
    assert(stripTagFootersPattern.test('##1Okay'), 'Numeric token');
    assert(stripTagFootersPattern.test('##3am'), 'Mixed token');
  });

  it('should match YAML footer lines with multiple tag tokens', () => {
    const footer = '##19864Residential ##1Okay ##3am ##ABQLo';
    assert(stripTagFootersPattern.test(footer), 'Multiple tokens');
  });

  it('should NOT match content lines', () => {
    assert(!stripTagFootersPattern.test('This is real content'), 'Regular text');
    assert(!stripTagFootersPattern.test('Code: function test() {}'), 'Code snippet');
    assert(!stripTagFootersPattern.test('##Token inline with text'), 'Inline token');
  });

  it('should identify footer removal scenario', () => {
    const content = `Real content here\n##19864Residential\n##1Okay\n##3am`;
    const lines = content.split('\n');
    let footerLines = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (stripTagFootersPattern.test(lines[i].trim())) footerLines++;
      else break;
    }
    assert.strictEqual(footerLines, 3, 'Should identify 3 footer lines');
  });
});
