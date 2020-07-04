

import yargs from 'yargs';

import { readConfig } from './config';
import { ServerProcess } from './serverprocess';

const argv = yargs.options({
    f: { type: 'string', default: './config.json', alias: 'file', description: 'Configuaration path' },
    b: { type: 'string', choices: ['', '32'], default: '' }
}).argv;

const sleep = (waitTimeInMs: number) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

async function main() {

    const config = readConfig(argv.f);

    const server = new ServerProcess(config);
    await server.init();

    await sleep(1000);
    server.start();
}

main();

