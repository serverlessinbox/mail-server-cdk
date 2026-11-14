/** The installed folders of the two packages the packed check compares, each listed by absolute path. */
export interface InstalledCopies {
  readonly awsCdkLib:  string[];
  readonly constructs: string[];
}
