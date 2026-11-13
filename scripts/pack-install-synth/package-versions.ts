/** Package names mapped to the version range or exact version pinned for each. */
export interface PackageVersions {
  readonly [packageName: string]: string;
}
