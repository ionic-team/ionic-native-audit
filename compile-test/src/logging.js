'use strict';

import * as chalk from 'chalk';

export const error = (str) => {
  process.stdout.write(`${chalk.red('Error:')} ${str}\n`);
};

export const warn = (str) => {
  process.stdout.write(`${chalk.yellow('Warning:')} ${str}\n`);
};

export const ok = (str) => {
  process.stdout.write(` ${chalk.green(str)}\n`);
};

export const failed = (str) => {
  process.stdout.write(` ${chalk.red(str)}\n`);
};

export const write = (str) => {
  process.stdout.write(`${str}`);
};

export const writeLn = (str) => {
  process.stdout.write(`${str}\n`);
};