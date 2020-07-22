#!/usr/bin/env node

import yargs from 'yargs';
import semver from 'semver';

import { readConfig, OecConfig } from './config';
import { ServerProcess } from './serverprocess';

const argv = yargs.options({
    f: { type: 'string', default: './.oecconfig', alias: 'file', description: 'Configuration path' },
    c: { type: 'boolean', default: false, alias: 'counter', description: 'display counter' },
    d: { type: 'boolean', default: false, alias: 'delete', description: 'delete rcode before compiling' },
    t: { type: 'string', alias: 'targetdir', description: 'override for targetdir in .oecconfig' },
    v: { type: 'boolean', default: false, alias: 'verbose', description: 'display verbose information' }
}).argv;

export const sleep = (waitTimeInMs: number): Promise<void> => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

async function main() {

    const config = readConfig(argv.f);

    processArgs(config);

    const validationOK = validate();
    if (!validationOK) {
        process.exit(1);
    }

    const server = new ServerProcess(config);
    await server.init();

    await sleep(100);  //  give processes chance to start
    server.start();
}

function processArgs(config: OecConfig): void {

    // --delete
    if (argv.d === true) {
        config.deleteRcode = true;  // provide cli override with -d
    }

    // --verbose
    if (argv.v === true) {
        config.verbose = true;
    }

    // --targetdir
    if (argv.t) {
        config.targetdir = argv.t;
    }

    // --counter
    config.counter = argv.c;
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
