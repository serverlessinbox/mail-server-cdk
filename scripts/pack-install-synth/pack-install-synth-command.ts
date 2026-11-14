import { Command }              from 'clipanion';
import { readFile, rm }         from 'node:fs/promises';
import * as path                from 'node:path';

import { DiffReportFormatter }  from '../template-baseline/diff-report-formatter';
import { FrozenProcessValues }  from '../template-baseline/frozen-process-values';
import { TemplateDiffer }       from '../template-baseline/template-differ';
import { errorMessage }         from '../utils/error-message';
import type { JsonObject }      from '../utils/json-value';

import type { InstalledCopies } from './installed-copies';
import type { PackedSynthesis } from './packed-synthesis';
import { PackedSynthesizer }    from './packed-synthesizer';
import { ProcessRunner }        from './process-runner';
import { SourceSynthesizer }    from './source-synthesizer';

/** The packages a consumer installs, in pack order: the cognito package peers on the mailbox package. */
const PACKED_WORKSPACES = ['@serverlessinbox/mailbox', '@serverlessinbox/mailbox-cognito'];

/** The repository root, two folders above this script. */
const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..');

/** The name the report gives the example stack. */
const STACK_NAME = 'consumer-stack';

/**
 * `pack-install-synth`: packs the published packages, installs them into an empty project and requires
 * the example stack synthesized there to match the same stack synthesized from source. Exits 0 when every
 * check passes, 1 when a check fails (the failing parts are printed and the packed folder is kept), and 2
 * when the check itself cannot run.
 */
export class PackInstallSynthCommand extends Command {
  static usage = Command.Usage({
    description: 'Pack @serverlessinbox/mailbox and @serverlessinbox/mailbox-cognito, install the tarballs into an empty project at the versions yarn.lock resolves, synthesize the example stack from both sides and require identical CloudFormation templates. Writes the packages\' gitignored build outputs and a temporary folder; needs network access to the npm registry. Exits 0 when every check passes, 1 when a check fails (the packed folder is kept and printed), and 2 when the check itself cannot run.',
    examples:    [
      ['Run the packed-install check from the repository root', 'yarn pack-install-synth'],
    ],
  });

  private readonly runner = new ProcessRunner();
  private readonly differ = new TemplateDiffer();
  private readonly reportFormatter = new DiffReportFormatter();

  async execute(): Promise<number> {
    try {
      return await this.checkPackedInstall();
    } catch (error) {
      this.context.stderr.write(`pack-install-synth failed: ${errorMessage(error)}\n`);
      return 2;
    }
  }

  /** Synthesizes both sides, then removes the packed folder on success and keeps it on failure. */
  private async checkPackedInstall(): Promise<number> {
    const frozenValues      = FrozenProcessValues.forBaseline();
    const source            = new SourceSynthesizer(frozenValues).synthesize();
    const packedSynthesizer = await this.createPackedSynthesizer(frozenValues);
    const packed            = await packedSynthesizer.synthesize();

    const report = this.failureReport(source, packed);
    if (report === '') {
      await rm(packed.directory, { recursive: true, force: true });
      return 0;
    }
    this.context.stdout.write(`${report}Kept: ${packed.directory}\n`);
    return 1;
  }

  private async createPackedSynthesizer(frozenValues: FrozenProcessValues): Promise<PackedSynthesizer> {
    const lockText = await this.readLockText();
    return new PackedSynthesizer(
      this.runner,
      REPOSITORY_ROOT,
      PACKED_WORKSPACES,
      lockText,
      frozenValues.frozenTimeMillis,
      frozenValues.frozenRandom,
    );
  }

  private async readLockText(): Promise<string> {
    return readFile(path.join(REPOSITORY_ROOT, 'yarn.lock'), 'utf8');
  }

  /** Every failed check, in order, as one text; empty when all checks pass. */
  private failureReport(source: JsonObject, packed: PackedSynthesis): string {
    return [
      this.packedFailureReport(packed.failure),
      ...this.copyCountReports(packed.installedCopies),
      this.templateReport(source, packed.template),
    ].join('');
  }

  private packedFailureReport(failure: string | undefined): string {
    return failure === undefined ? '' : `Packed synthesis failed:\n${failure}\n`;
  }

  private copyCountReports(copies: InstalledCopies): string[] {
    return [this.copyCountReport('aws-cdk-lib', copies.awsCdkLib), this.copyCountReport('constructs', copies.constructs)];
  }

  private copyCountReport(packageName: string, directories: readonly string[]): string {
    if (directories.length === 1) {
      return '';
    }
    return `Expected one installed copy of ${packageName}, found ${directories.length}:\n${directories.map((directory) => `  ${directory}\n`).join('')}`;
  }

  private templateReport(source: JsonObject, template: JsonObject | undefined): string {
    if (template === undefined) {
      return '';
    }
    const diff = this.differ.diff(source, template);
    return diff.identical ? '' : this.reportFormatter.format(STACK_NAME, diff);
  }
}
