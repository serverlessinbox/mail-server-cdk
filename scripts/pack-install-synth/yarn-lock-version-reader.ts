/**
 * Reads the resolved version of one npm descriptor from the text of a Yarn Berry `yarn.lock`. A block's
 * unindented header lists its descriptors, comma-separated inside one quoted string; its indented
 * `version:` line holds the resolved version.
 */
export class YarnLockVersionReader {
  private static readonly versionLinePattern = /^ {2}version: "?([^"]+)"?$/;

  private readonly lockLines: readonly string[];

  public constructor(lockText: string) {
    this.lockLines = lockText.split(/\r?\n/);
  }

  /** Returns the `version:` of the block that lists `<packageName>@npm:<range>`. Throws, naming the descriptor, when no block lists it. */
  public read(packageName: string, range: string): string {
    const descriptor  = `${packageName}@npm:${range}`;
    const headerIndex = this.lockLines.findIndex(line => this.headerDescriptors(line).includes(descriptor));
    if (headerIndex < 0) {
      throw new Error(`yarn.lock has no entry for ${descriptor}`);
    }
    return this.versionAfter(headerIndex, descriptor);
  }

  private headerDescriptors(line: string): string[] {
    if (!this.isHeader(line)) {
      return [];
    }
    return line.slice(0, -1).split(', ').map(part => part.replace(/^"|"$/g, ''));
  }

  private isHeader(line: string): boolean {
    return line.length > 0 && !line.startsWith(' ') && !line.startsWith('#') && line.endsWith(':');
  }

  private versionAfter(headerIndex: number, descriptor: string): string {
    for (let index = headerIndex + 1; index < this.lockLines.length; index++) {
      const line = this.lockLines[index];
      if (!line.startsWith('  ')) {
        break;
      }
      const match = YarnLockVersionReader.versionLinePattern.exec(line);
      if (match) {
        return match[1];
      }
    }
    throw new Error(`yarn.lock block for ${descriptor} has no version`);
  }
}
