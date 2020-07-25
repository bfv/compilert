
import fs from 'fs';

export interface OecConfig {
    dlc: string,
    executable: string,
    threads: number,
    minport: number,
    maxport: number,
    workdir: string,
    srcroot: string,
    targetdir: string,
    batchSize: number,
    deleteRcode: boolean,
    verbose: boolean,
    counter: boolean,
    listconfig: boolean,
    startupParameters: Array<string>
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
