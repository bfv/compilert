#!/usr/bin/env node

import yargs from 'yargs';
import semver from 'semver';

import { readConfig } from './config';
import { ServerProcess } from './serverprocess';

const argv = yargs.options({
    f: { type: 'string', default: './.oecconfig', alias: 'file', description: 'Configuration path' },
    d: { type: 'boolean', default: false, alias: 'delete', description: 'delete rcode before compiling' },
    v: { type: 'boolean', default: false, alias: 'verbose'}
}).argv;

export const sleep = (waitTimeInMs: number): Promise<void> => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

async function main() {

    const config = readConfig(argv.f);
    if (argv.d === true) {
        config.deleteRcode = true;  // provide cli override with -d
    }

    if (argv.v === true) {
        config.verbose = true;
    }

    const validationOK = validate();
    if (!validationOK) {
        process.exit(1);
    }

    const server = new ServerProcess(config);
    await server.init();

    await sleep(100);  //  give processes chance to start
    server.start();
}

function validate(): boolean {

    let validationOK = true;

    const versionOK = semver.satisfies(process.versions.node, '>=12.10.0');
    if (!versionOK) {
        console.log('ERROR: node.js version should be >= 12.10.0');
        validationOK = false;
    }

    return validationOK;
} 

main();
