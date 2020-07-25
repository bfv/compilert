#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import semver from 'semver';
import yargs from 'yargs';

import { readConfig, OecConfig } from './config';
import { ServerProcess } from './serverprocess';

const argv = yargs.options({
    b: { type: 'number', alias: 'batchsize', description: 'compile source per this amount' },
    c: { type: 'boolean', alias: 'counter', description: 'display counter' },
    d: { type: 'boolean', alias: 'delete', description: 'delete rcode before compiling' },
    f: { type: 'string', alias: 'file', default: './.oecconfig', description: 'Configuration path' },
    l: { type: 'boolean', alias: 'listconfig', description: 'list effective configuration' }, 
    t: { type: 'string', alias: 'targetdir', description: 'override for targetdir in .oecconfig' },
    v: { type: 'boolean', alias: 'verbose', description: 'display verbose information' },
    x: { type: 'boolean', alias: 'test' }
}).argv;

export const sleep = (waitTimeInMs: number): Promise<void> => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

async function main() {

    const config = readConfig(argv.f);

    processArgsAndDefaults(config);

    const validationOK = validate(config);
    if (!validationOK) {
        process.exit(1);
    }

    if (config.listconfig) {
        console.log('effective config:\n', JSON.stringify(config, null, 4));
    }
    
    const server = new ServerProcess(config);
    await server.init();

    await sleep(100);  //  give processes chance to start
    server.start();
}

function processArgsAndDefaults(config: OecConfig): void {
    config.batchSize = argv.b ?? config.batchSize ?? 10;
    config.counter = argv.c ?? config.counter ?? false;
    config.deleteRcode = argv.d ?? config.deleteRcode ?? false;
    config.listconfig = argv.l ?? config.listconfig ?? false;
    config.targetdir = argv.t ?? config.targetdir;
    config.verbose = argv.v ?? config.verbose ?? false;
}


function validate(config: OecConfig): boolean {

    let validationOK = true;

    const versionOK = semver.satisfies(process.versions.node, '>=12.10.0');
    if (!versionOK) {
        console.log('ERROR: node.js version should be >= 12.10.0');
        validationOK = false;
    }

    if (!fs.existsSync(config.dlc)) {
        console.log(`dlc directory '${config.dlc} doesn't exist'`);
        validationOK = false;
    }
    else {
        if (!fs.existsSync(path.join(config.dlc, 'bin', config.executable))) {
            console.log(`executable '${config.executable}' not found in dlc/bin directory '${config.dlc}/bin'`);
            validationOK = false;
        }    
    }

    if (!fs.existsSync(config.workdir)) {
        console.log(`workdir directory '${config.workdir} doesn't exist'`);
        validationOK = false;
    }

    if (!fs.existsSync(config.srcroot)) {
        console.log(`srcroot directory '${config.srcroot} doesn't exist'`);
        validationOK = false;
    }

    if (!(config.batchSize > 0)) {
        console.log('batchsize should be > 0');
        validationOK = false;
    }

    return validationOK;
} 

main();
