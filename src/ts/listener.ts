import { Config } from "./config";
import { ServerProcess } from "./serverprocess";

export class Listener {

    constructor(private config: Config, private port: number, private server: ServerProcess) {
        
    }

}