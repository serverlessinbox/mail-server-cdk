import { YarnLockVersionReader } from '../yarn-lock-version-reader';

/**
 * Pins how a Yarn Berry lock header names its descriptors (`"<name>@npm:<range>"`, several joined by
 * `, ` inside one quoted string) and which `version:` line belongs to it. The fixtures copy that
 * header shape from the repository's own `yarn.lock`. Matching a descriptor by prefix or by range
 * text would pin the wrong peer version into the consumer project.
 */
describe('YarnLockVersionReader', () => {
  it('returns the version of a block with one descriptor', () => {
    const reader = new YarnLockVersionReader([
      '__metadata:',
      '  version: 8',
      '',
      '"aws-cdk-lib@npm:^2.261.0":',
      '  version: 2.261.0',
      '  resolution: "aws-cdk-lib@npm:2.261.0"',
      '  linkType: hard',
      '',
    ].join('\n'));

    expect(reader.read('aws-cdk-lib', '^2.261.0')).toBe('2.261.0');
  });

  it('matches a range listed among several descriptors of one block', () => {
    const reader = new YarnLockVersionReader([
      '"constructs@npm:^10.0.0, constructs@npm:^10.5.0":',
      '  version: 10.6.0',
      '  resolution: "constructs@npm:10.6.0"',
      '',
    ].join('\n'));

    expect(reader.read('constructs', '^10.5.0')).toBe('10.6.0');
  });

  it('matches a scoped package name', () => {
    const reader = new YarnLockVersionReader([
      '"@serverlessinbox/artifact-registry-cdk@npm:^0.3.0":',
      '  version: 0.3.0',
      '  resolution: "@serverlessinbox/artifact-registry-cdk@npm:0.3.0"',
      '',
    ].join('\n'));

    expect(reader.read('@serverlessinbox/artifact-registry-cdk', '^0.3.0')).toBe('0.3.0');
  });

  it('returns the version of the block whose range matches, not the other block of the same name', () => {
    const reader = new YarnLockVersionReader([
      '"left-pad@npm:^1.0.0":',
      '  version: 1.2.3',
      '',
      '"left-pad@npm:^2.0.0":',
      '  version: 2.0.1',
      '',
    ].join('\n'));

    expect(reader.read('left-pad', '^1.0.0')).toBe('1.2.3');
    expect(reader.read('left-pad', '^2.0.0')).toBe('2.0.1');
  });

  it('throws naming the descriptor when no block lists it', () => {
    const reader = new YarnLockVersionReader('"aws-cdk-lib@npm:^2.261.0":\n  version: 2.261.0\n');

    expect(() => reader.read('missing-package', '^1.0.0')).toThrow('missing-package@npm:^1.0.0');
  });
});
