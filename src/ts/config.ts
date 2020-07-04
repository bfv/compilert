
import fs from 'fs';

export interface Config {
    dlc: string;
    executable: string,
    threads: number,
    minport: number,
    maxport: number,
    workdir: string,
    targetdir: string,
    startupParameters: Array<string>
}

export function readConfig(configFilename: string): Config {

    let config: Config;

    try {
        let data = fs.readFileSync(configFilename);
        config = <Config>JSON.parse(data.toString());
    }
    catch (error) {
        console.log(error);
        process.exit(1);
    }

    return config;
}