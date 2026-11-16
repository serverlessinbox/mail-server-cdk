import { sourceRuleScope } from '../package-roots';

describe('sourceRuleScope', () => {
  it('lists the src tree of each source package as a file glob', () => {
    expect(sourceRuleScope.files).toEqual([
      'packages/mail-server/src/**/*.ts',
      'packages/mail-server-cdk-shared/src/**/*.ts',
      'packages/mail-server-cognito/src/**/*.ts',
    ]);
  });

  it('ignores the runtime and test folders of each source package', () => {
    expect(sourceRuleScope.ignores).toEqual([
      'packages/mail-server/src/runtime/**',
      'packages/mail-server/src/**/__tests__/**',
      'packages/mail-server-cdk-shared/src/runtime/**',
      'packages/mail-server-cdk-shared/src/**/__tests__/**',
      'packages/mail-server-cognito/src/runtime/**',
      'packages/mail-server-cognito/src/**/__tests__/**',
    ]);
  });
});
