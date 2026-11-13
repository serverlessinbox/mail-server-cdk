import type { ProcessResult } from './process-result';
import { ProcessRunner }      from './process-runner';

/** Characters of the packing output kept in an error message: yarn reports the failure at the end. */
const OUTPUT_TAIL_LENGTH = 2000;

/**
 * Packs one workspace into a tarball with `yarn workspace <name> pack`, which runs the package's
 * `prepack` chain (jsii build, stack templates, bundle) before it writes the tarball.
 */
export class PackagePacker {
  private readonly runner: ProcessRunner;
  private readonly repositoryRoot: string;

  constructor(runner: ProcessRunner, repositoryRoot: string) {
    this.runner         = runner;
    this.repositoryRoot = repositoryRoot;
  }

  /** Writes the tarball to `outFile`. Throws, naming the workspace and the end of yarn's output, when packing fails. */
  public async pack(workspaceName: string, outFile: string): Promise<void> {
    const result = await this.runner.run('yarn', ['workspace', workspaceName, 'pack', '--out', outFile], {
      cwd: this.repositoryRoot,
      env: process.env,
    });
    if (result.exitCode !== 0) {
      throw new Error(`Packing ${workspaceName} failed with exit code ${result.exitCode}: ${this.outputTail(result)}`);
    }
  }

  private outputTail(result: ProcessResult): string {
    return `${result.stdout}${result.stderr}`.slice(-OUTPUT_TAIL_LENGTH);
  }
}
