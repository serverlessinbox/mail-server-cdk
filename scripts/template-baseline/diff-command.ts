import { errorMessage }        from '../utils/error-message';
import type { JsonObject }     from '../utils/json-value';

import { BaselineCommand }     from './baseline-command';
import { DiffReportFormatter } from './diff-report-formatter';
import { TemplateDiffer }      from './template-differ';

/**
 * `template-baseline diff`: synthesizes the templates again and compares each one with the captured
 * baseline. `execute` returns 0 when every template is identical, 1 when any differs, and 2 when the
 * comparison itself fails, so a gate can tell a changed template from a broken tool.
 */
export class DiffCommand extends BaselineCommand {
  static paths = [['diff']];
  static usage = BaselineCommand.Usage({
    description: 'Synthesize the templates again and report, per stack, the logical IDs added, removed, and changed (with the property paths that changed) against the baseline captured under the label. Exits 0 when all templates are identical, 1 when any differs, and 2 when the comparison itself fails (for example a missing baseline, or a synth or parse error).',
    examples:    [
      ['Compare against the default baseline', 'yarn template-baseline diff'],
      ['Compare against a named baseline', 'yarn template-baseline diff --label before-resource-split'],
    ],
  });

  private readonly differ = new TemplateDiffer();
  private readonly reportFormatter = new DiffReportFormatter();

  async execute(): Promise<number> {
    try {
      return await this.compareAll();
    } catch (error) {
      return this.reportFailure(error);
    }
  }

  /** Compares every stack, reporting each one even after a difference, and returns 0 only when all are identical. */
  private async compareAll(): Promise<number> {
    const store                = this.createStore();
    const identical: boolean[] = [];
    for (const { stackName, template } of this.createSynthesizer().synthesize()) {
      const baseline = await store.readStackTemplate(this.label, stackName);
      identical.push(this.compare(stackName, baseline, template));
    }
    return identical.every((isIdentical) => isIdentical) ? 0 : 1;
  }

  /** Writes the report of one stack and returns whether it is identical to its baseline. */
  private compare(stackName: string, baseline: JsonObject, template: JsonObject): boolean {
    const diff = this.differ.diff(baseline, template);
    this.context.stdout.write(this.reportFormatter.format(stackName, diff));
    return diff.identical;
  }

  /** A failed comparison is not a difference: it is reported on stderr and exits 2. */
  private reportFailure(error: unknown): number {
    this.context.stderr.write(`template-baseline diff failed: ${errorMessage(error)}\n`);
    return 2;
  }

}
