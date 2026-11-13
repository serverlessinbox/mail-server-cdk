/** The outcome of a child process that ran to its end: its exit code and both captured streams. */
export interface ProcessResult {
  readonly exitCode: number;
  readonly stdout:   string;
  readonly stderr:   string;
}
