'use strict';

import * as fs from 'fs';
import { error, failed, ok, warn, write, writeLn } from './logging';
import { execSync } from 'child_process';

let xcodeBuildDestination;

export const downloadProject = (repo, folder) => {
  ok(`Cloning ${repo}`);
  fs.rmdirSync(folder, { recursive: true });
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
  }
  execSync(`git clone ${repo}`, { cwd: folder });
}

export const process = async (options) => {
  const run = (command, test, folder) => {
    write(command);
    let log;
    try {
      const cwd = (folder) ? folder : options.projectFolder;
      log = execSync(command, { cwd: cwd });
      ok('Success');
      if (options.verbose) {
        write(log);
      }
      if (test) {
        writeResult(options, test, true);
      }
    } catch (error) {
      failed('Failed');
      writeFailure(options, error.stdout.toString() + '\n' + command, error.stderr.toString());
      writeResult(options, test, false);
      throw new Error('Command ' + command + ' Failed');
    }
  }

  if (!fs.existsSync(options.projectFolder)) {
    error(`Path does not exist ${options.projectFolder}`);
    throw new Error('Path does not exist: ' + options.projectFolder);
  }

  try {
    run('git clean -fdx');
    run('git restore .');
    run('rm -rf plugins');
    run('rm -rf platforms');
    run('npm install');
    if (options.isCordova) {
      run(`ionic cordova plugin add ${options.plugin}`, 'pluginExists');
    }
    if (options.isCapacitor) {
      run(`npm install ${options.plugin}`, 'pluginExists');
    }
    for (const command of options.commands) {
      run(command);
    }
    if (options.isCordova && options.android) {
      run('ionic cordova build android', 'android');
    }
  } finally { }

  try {
    if (options.isCordova && options.ios) {
      run('ionic cordova build ios', 'ios');
    }
  } finally { }

  try {
    if (options.isCapacitor) {
      run('npm run build', 'builds');
      run('npx cap sync', 'capacitorSync');
      if (options.ios) {
        prepareBuild(options);
        run(`xcodebuild -workspace App.xcworkspace -scheme App -destination "${xcodeBuildDestination}"`, 'ios', options.projectFolder + '/ios/App');
      }
      if (options.android) {
        run('./gradlew', 'android', options.projectFolder + '/android');
      }
    }
  } finally { }
};

const listPlatforms = (text) => {
  const lines = text.split('\n');
  let result = '[';
  for (const line of lines) {
    if (line.includes('Ineligible')) {
      break;
    }
    if (line.includes('{ platform')) {
      let device = line.replace(/:/g, '":"');
      device = device.replace(/, /g, '", "');
      device = device.replace(' }', '"}');
      device = device.replace('{ ', '{"');
      device = device.trim();
      result += device + ',';
    }
  }
  return JSON.parse(result.substring(0, result.length - 1) + ']');
}

const prepareBuild = (options) => {
  const folder = options.projectFolder + '/ios/App';
  const log = execSync('xcodebuild -workspace App.xcworkspace -scheme App -showdestinations', { cwd: folder });
  const devices = listPlatforms(log.toString());
  // devices has { platform: 'iOS Simulator', id: 'guid', OS: '14.5', name: 'iPad (8th Generation)' }
  const device = devices.find((device) => { return device.name == 'iPhone 12' })
  xcodeBuildDestination = `platform=${device.platform},id=${device.id}`;
}

const writeResult = (options, test, success) => {
  let result = loadResults();
  if (!result[options.plugin]) {
    result[options.plugin] = { name: options.name };
  }
  let res = result[options.plugin][options.projectName];
  if (!res) res = {};
  res[test] = success;
  result[options.plugin][options.projectName] = res;
  saveResults(result);
}

const resultFileName = './results/results.json';

const writeFailure = (options, command, log) => {
  const data = '> ' + command + '\n' + log;
  const filename = './results/plugin-' + options.plugin + '-errors.txt';
  fs.writeFileSync(filename, data);
}

export const loadResults = () => {
  if (fs.existsSync(resultFileName)) {
    const json = fs.readFileSync(resultFileName);
    return JSON.parse(json);
  }
  return {};
}

const saveResults = (data) => {
  fs.writeFileSync(resultFileName, JSON.stringify(data, null, 2));
}

