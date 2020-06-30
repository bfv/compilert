

import { Config, readConfig } from './config';
import yargs from 'yargs';
import { Thread } from './thread';

const argv = yargs.options({
    f: { type: 'string', default: './config.json', alias: 'file', description: 'Configuaration path' },
    b: { type: 'string', choices: ['', '32'], default: '' }
}).argv;

let config = readConfig(argv.f);

// console.log('cli args:\n', JSON.stringify(argv, null, 4), '\n');
// console.log('configuration:\n', JSON.stringify(config, null, 4));

// console.log(executeThis);


// console.log(params);
// process.exit(0);

const t0 = new Thread(0, config);

const sleep = (waitTimeInMs: number) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

sleep(1000).then(() => {

    const files = [
            'test/test1.p',
            'test/test2.p',
            'test/test3.p'
        ];

    t0.compile(files);
});




// console.log('end of file');