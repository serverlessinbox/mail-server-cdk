import { ImportTargetResolver } from '../import-target-resolver';
import { mailServerPackage }    from '../package-roots';
import { ZoneClassifier }       from '../zone-classifier';

const resolver = new ImportTargetResolver(new ZoneClassifier());

describe('ImportTargetResolver.resolve', () => {
  it('resolves a relative specifier against the importing file', () => {
    expect(resolver.resolve('../platform/x', 'packages/mail-server/src/core/a.ts')).toEqual({
      relative: true,
      location: { packageRoot: mailServerPackage, rest: 'platform/x' },
    });
  });

  it('resolves a sibling specifier', () => {
    expect(resolver.resolve('./b', 'packages/mail-server/src/core/a.ts')).toEqual({
      relative: true,
      location: { packageRoot: mailServerPackage, rest: 'core/b' },
    });
  });

  it('maps a package-name subpath onto the package src folder', () => {
    expect(resolver.resolve('@serverlessinbox/mail-server/core/x', 'packages/mail-server-cognito/src/a.ts')).toEqual({
      relative: false,
      location: { packageRoot: mailServerPackage, rest: 'core/x' },
    });
  });

  it('maps a bare package name onto its index', () => {
    expect(resolver.resolve('@serverlessinbox/mail-server', 'packages/mail-server-cdk-shared/src/a.ts')).toEqual({
      relative: false,
      location: { packageRoot: mailServerPackage, rest: 'index' },
    });
  });

  it('does not treat a longer package name as a subpath of a known one', () => {
    expect(resolver.resolve('@serverlessinbox/mailboxx/core/x', 'packages/mail-server/src/a.ts')).toEqual({ relative: false, location: null });
  });

  it('has no location for an external package', () => {
    expect(resolver.resolve('aws-cdk-lib/aws-iam', 'packages/mail-server/src/a.ts')).toEqual({ relative: false, location: null });
  });
});
