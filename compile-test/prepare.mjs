import * as fs from 'fs';
const data = fs.readFileSync('check.js')
const fd = fs.openSync('check.js', 'w+')
const insert = Buffer.from("#!/usr/bin/env node \n")
fs.writeSync(fd, insert, 0, insert.length, 0)
fs.writeSync(fd, data, 0, data.length, insert.length)
fs.close(fd, (err) => {
  if (err) throw err;
});


