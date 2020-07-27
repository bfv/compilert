
import fs from 'fs';

export interface OecConfig {
    dlc: string,
    executable: string,
    threads: number,
    minport: number,
    maxport: number,
    workdir: string,
    srcroot: string,
    basedir: string,
    targetdir: string,
    batchsize: number,
    deletercode: boolean,
    verbose: boolean,
    counter: boolean,
    listconfig: boolean,
    oecconfigdir: string,
    startupparameters: Array<string>
}

export function readConfig(configFilename: string): OecConfig {

    let config: OecConfig;

    try {
        const data = fs.readFileSync(configFilename);
        config = <OecConfig>JSON.parse(data.toString());
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }

    return config;
}
