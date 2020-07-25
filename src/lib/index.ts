#!/usr/bin/env node

import yargs from 'yargs';
import semver from 'semver';

import { readConfig, OecConfig } from './config';
import { ServerProcess } from './serverprocess';

const argv = yargs.options({
    f: { type: 'string', default: './.oecconfig', alias: 'file', description: 'Configuration path' },
    c: { type: 'boolean', alias: 'counter', description: 'display counter' },
    d: { type: 'boolean', alias: 'delete', description: 'delete rcode before compiling' },
    t: { type: 'string', alias: 'targetdir', description: 'override for targetdir in .oecconfig' },
    v: { type: 'boolean', alias: 'verbose', description: 'display verbose information' },
    x: { type: 'boolean', alias: 'test' }
}).argv;

export const sleep = (waitTimeInMs: number): Promise<void> => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

async function main() {

    const config = readConfig(argv.f);

    processArgsAndDefaults(config);
    
    const validationOK = validate();
    if (!validationOK) {
        process.exit(1);
    }

    const server = new ServerProcess(config);
    await server.init();

    await sleep(100);  //  give processes chance to start
    server.start();
}

function processArgsAndDefaults(config: OecConfig): void {
    config.targetdir = argv.t ?? config.targetdir;
    config.counter = argv.c ?? config.counter ?? false;
    config.deleteRcode = argv.d ?? config.deleteRcode ?? false;
    config.verbose = argv.v ?? config.verbose ?? false;
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
