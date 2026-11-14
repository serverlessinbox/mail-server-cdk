import type { EntryChange, TemplateDiff } from './template-diff';

/**
 * Formats the report of one stack's template diff: its verdict, then the added, removed and changed
 * entries with the property paths that differ. The text is the same for every command that reports a diff.
 */
export class DiffReportFormatter {
  /** The text of one stack's report: its verdict, then the added, removed and changed entries. */
  format(stackName: string, diff: TemplateDiff): string {
    const lines = [`${stackName}: ${diff.identical ? 'identical' : 'DIFFERENT'}`];

    lines.push(...this.entryList('added', diff.added));
    lines.push(...this.entryList('removed', diff.removed));
    lines.push(...this.changeList('changed', diff.changed));

    return `${lines.join('\n')}\n`;
  }

  private entryList(heading: string, entryIds: string[]): string[] {
    if (entryIds.length === 0) {
      return [];
    }
    return [`  ${heading} (${entryIds.length}):`, ...entryIds.map((entryId) => `    ${entryId}`)];
  }

  private changeList(heading: string, changes: EntryChange[]): string[] {
    if (changes.length === 0) {
      return [];
    }
    return [
      `  ${heading} (${changes.length}):`,
      ...changes.flatMap((change) => [`    ${change.entryId}`, ...change.propertyPaths.map((path) => `      ${path}`)]),
    ];
  }
}
