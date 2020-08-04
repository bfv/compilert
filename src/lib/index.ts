#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import semver from 'semver';
import yargs from 'yargs';
import readline from 'readline-sync';

import { readConfig, OecConfig } from './config';
import { ServerProcess } from './serverprocess';

const argv = yargs.options({
    b: { type: 'number', alias: 'batchsize', description: 'compile source per this amount' },
    c: { type: 'boolean', alias: 'counter', description: 'display counter' },
    create: { type: 'boolean', description: 'create .oecconfig file in current dir' },
    d: { type: 'boolean', alias: 'delete', description: 'delete rcode before compiling' },
    f: { type: 'string', alias: 'file', default: './.oecconfig', description: 'Configuration path' },
    l: { type: 'boolean', alias: 'listconfig', description: 'list effective configuration' },
    s: { type: 'string', alias: 'srcroot', description: 'compilation start directory' },
    t: { type: 'string', alias: 'targetdir', description: 'override for targetdir in .oecconfig' },
    T: { type: 'number', alias: 'threads', desription: 'override for the number of used threads' },
    v: { type: 'boolean', alias: 'verbose', description: 'display verbose information' },
    w: { type: 'string', alias: 'workdir', description: 'set session working directory' }
}).argv;

export const sleep = (waitTimeInMs: number): Promise<void> => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

async function main() {

    if (argv.create) {
        createDefaultConfig();
        process.exit(0);
    }

    const config = readConfig(argv.f);
    config.oecconfigdir = path.dirname(fs.realpathSync(argv.f));

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

    config.batchsize = argv.b ?? config.batchsize ?? 10;
    config.counter = argv.c ?? config.counter ?? false;
    config.deletercode = argv.d ?? config.deletercode ?? false;
    config.listconfig = argv.l ?? config.listconfig ?? false;
    config.targetdir = argv.t ?? config.targetdir;
    config.threads = argv.T ?? config.threads ?? 4;  // 4 is a reasonable default
    config.verbose = argv.v ?? config.verbose ?? false;
    config.workdir = argv.w ?? config.workdir;

    if (config.srcroot) {
        const sourceset = { srcroot: config.srcroot, basedir: config.basedir ?? '' };
        config.sourcesets.push(sourceset);
    }
    
    for (const soureceset of config.sourcesets) {

        soureceset.basedir = soureceset.basedir ?? soureceset.srcroot;
        
        if (soureceset.basedir.startsWith('./')) {
            soureceset.basedir = path.join(config.oecconfigdir, soureceset.basedir);
        }

        if (soureceset.srcroot.startsWith('./')) {
            soureceset.srcroot = path.join(config.oecconfigdir, soureceset.srcroot);
        }
    }

    if (config.targetdir.startsWith('./')) {
        config.targetdir = path.join(config.oecconfigdir, config.targetdir);
    }

    if (config.workdir.startsWith('./')) {
        config.workdir = path.join(config.oecconfigdir, config.workdir);
    }
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

    for (const soureceset of config.sourcesets) {
        if (!fs.existsSync(soureceset.srcroot)) {
            console.log(`srcroot directory '${soureceset.srcroot} doesn't exist'`);
            validationOK = false;
        }

        if (!fs.existsSync(soureceset.basedir)) {
            console.log(`basedir directory '${soureceset.basedir} doesn't exist'`);
            validationOK = false;
        }
    }

    if (!(config.batchsize > 0)) {
        console.log('batchsize should be > 0');
        validationOK = false;
    }

    return validationOK;
}

function createDefaultConfig(): void {

    const oecFilename = path.join(fs.realpathSync('.'), '.oecconfig');

    if (fs.existsSync(oecFilename)) {
        const reply = readline.question('.oecconfig already exists, overwrite? (y/N)');
        if (reply.toLowerCase() == 'y') {
            fs.unlinkSync(oecFilename);
        }
        else {
            console.log('aborted');
            process.exit(1);
        }
    }

    fs.copyFileSync(path.join(__dirname, '.oecconfig.template.json'), oecFilename);
}

main();
