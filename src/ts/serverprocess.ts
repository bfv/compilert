import { Config } from './config';
import { Thread } from './thread';
import getPort from 'get-port';
import { Listener } from './listener';
import fs from 'fs';
import path from 'path';

export class ServerProcess {

    private threads: Thread[] = [];
    private serverPort = -1;
    private listener!: Listener;

    constructor(private config: Config) {
        // this.init();
    }

    async init(): Promise<void> {

        // if a Promise is not set up and returned this will not get executed
        const promise = new Promise<void>((resolve) => {
            resolve();
        });

        this.serverPort = await this.getFreePort(this.config.minport, this.config.maxport);
        this.listener = new Listener(this.config, this.serverPort, this);
        await this.setupThreads();

        return promise;
    }

    private async setupThreads(): Promise<void> {
        console.log('threads:', this.config.threads);
        const promise = new Promise<void>(resolve => {
            let port = this.serverPort + 1;
            for (let threadNo = 0; threadNo < this.config.threads; threadNo++) {
                console.log('start thread:', threadNo);
                this.getFreePort(port, this.config.maxport).then((portIn) => {
                    port = portIn;
                    const thread = new Thread(threadNo, this.config, port);
                    this.threads.push(thread);
                });
            }
            resolve();
        });

        return promise;
    }

    private async getFreePort(startPort: number, maxPort: number): Promise<number> {
        const promise = getPort({ port: getPort.makeRange(startPort, maxPort) });
        return promise;
    }

    start(): void {
        // get files
        // distribute over threads
        // run compilation in batches in threads

        const allFiles = this.getFiles(this.config.srcroot);

        this.threads[0].compile(allFiles);
    }

    getFiles(directory: string): string[] {

        let files = this.readdirSync(directory, ['.p', '.w', '.cls']);
        files = this.normalizeFilenames(files, this.config.srcroot);

        return files;
    }

    private readdirSync (directory: string, filetypes: string[]): Array<string> {
    
        let files: Array<string> = [];
    
        const entries = fs.readdirSync(directory, { withFileTypes: true });
      
        for (let i = 0; i < entries.length; i++) {
            const currentEntry = entries[i];
    
            if (currentEntry.isDirectory()) {           
                files = [ ...files, ...this.readdirSync( path.join(directory,  currentEntry.name), filetypes)];
            }
            else if (currentEntry.isFile() && this.hasExtension(currentEntry.name, filetypes)) {
                files.push(path.join(directory,  currentEntry.name));
            }
        }
    
        return files;
    }

    private hasExtension(filename: string, extension: string[]) {
        return (new RegExp('(' + extension.join('|').replace(/\./g, '\\.') + ')$')).test(filename);
    }

    private normalizeFilenames(files: string[], rootdir: string): string[] {

        const normalizedFiles: string[] = [];
        const backslashes = /\\/g;

        rootdir = rootdir.replace(backslashes, '/');
        for (let i = 0; i < files.length; i++) {
            normalizedFiles.push(
                files[i].replace(backslashes, '/').replace(rootdir + '/', '')
            );

        }

        return normalizedFiles;
    }
}
