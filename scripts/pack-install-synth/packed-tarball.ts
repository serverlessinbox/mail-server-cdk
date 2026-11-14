/** A workspace packed into a tarball: its package name and the file `yarn pack` wrote. */
export interface PackedTarball {
  readonly name: string;
  readonly file: string;
}
