'use strict';

import { processPlugins } from './plugins';
import { ok } from './logging';
import * as fs from 'fs';

const plugins = JSON.parse(fs.readFileSync('./plugins.json'));

processPlugins(plugins);
ok('Successfully processed all plugins');

