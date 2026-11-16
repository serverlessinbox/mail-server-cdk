/**
 * Runs inside the clean project. Synthesizes the example consumer stack from the installed packages with
 * the clock and random number frozen to the given values, and writes its template to the output file.
 * Arguments: output file, frozen time in milliseconds, frozen random number.
 */
const { writeFile } = require('node:fs/promises');

async function main(argv) {
  const [outputFile, frozenTimeText, frozenRandomText] = argv;
  const frozenTime = Number(frozenTimeText);
  const frozenRandom = Number(frozenRandomText);

  Date.now = () => frozenTime;
  Math.random = () => frozenRandom;

  const cdk = require('aws-cdk-lib');
  const { Template } = require('aws-cdk-lib/assertions');
  const mailbox = require('@serverlessinbox/mail-server');
  const cognito = require('@serverlessinbox/mail-server-cognito');
  const { build } = require('./consumer-stack.js');

  const template = Template.fromStack(build({ cdk, mailbox, cognito })).toJSON();
  await writeFile(outputFile, JSON.stringify(template));
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
