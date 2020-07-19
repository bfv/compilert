#!/usr/bin/env node

import yargs from 'yargs';

import { readConfig } from './config';
import { ServerProcess } from './serverprocess';

const argv = yargs.options({
    f: { type: 'string', default: './config.json', alias: 'file', description: 'Configuaration path' },
    d: { type: 'boolean', default: false },
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

    const server = new ServerProcess(config);
    await server.init();

    await sleep(100);  //  give processes chance to start
    server.start();
}

main();
