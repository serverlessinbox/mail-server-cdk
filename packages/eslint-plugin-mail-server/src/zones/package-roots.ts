export interface PackageRoot {
  readonly name: string;
  readonly dir:  string;
}

export const mailServerPackage: PackageRoot = { name: '@serverlessinbox/mail-server', dir: 'mail-server' };

export const kitPackage: PackageRoot = { name: '@serverlessinbox/mail-server-cdk-shared', dir: 'mail-server-cdk-shared' };

export const cognitoPackage: PackageRoot = { name: '@serverlessinbox/mailbox-cognito', dir: 'mailbox-cognito' };

export const packageRoots: readonly PackageRoot[] = [mailServerPackage, kitPackage, cognitoPackage];

export interface SourceRuleScope {
  readonly files:   readonly string[];
  readonly ignores: readonly string[];
}

// The source trees the source rules govern. Runtime and test code inside them is outside the source rules.
export const sourceRuleScope: SourceRuleScope = {
  files:   packageRoots.map((root) => `packages/${root.dir}/src/**/*.ts`),
  ignores: packageRoots.flatMap((root) => [`packages/${root.dir}/src/runtime/**`, `packages/${root.dir}/src/**/__tests__/**`]),
};

// The kit's source is inlined into each package that uses it, so its classes and module state exist once per copy.
// Its runtime code is bundled once per Lambda zip and stays outside this scope.
export const kitSourceScope: SourceRuleScope = {
  files:   [`packages/${kitPackage.dir}/src/**/*.ts`],
  ignores: [`packages/${kitPackage.dir}/src/runtime/**`, `packages/${kitPackage.dir}/src/**/__tests__/**`],
};
