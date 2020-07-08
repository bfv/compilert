import getPort from 'get-port';
import fs from 'fs';
import path from 'path';

import { Config } from './config';
import { Thread } from './thread';
import { Listener } from './listener';

export interface Response4GL {
    process4GLresponse(response: { thread: number, status: string }): void;
}

export interface CompileResponse {
    thread: number,
    status: 'ok' | 'error',
    errornousFiles?: ({ file: string, error: string })[]
}

export class ServerProcess implements Response4GL {

    private threads: Thread[] = [];
    private serverPort = -1;
    private listener!: Listener;

    private remainingFiles: string[] = [];
    private activeThreads = 0;

    constructor(private config: Config) {
        // this.init();
    }

    async init(): Promise<void> {

        // if a Promise is not set up and returned this will not get executed
        const promise = new Promise<void>((resolve) => {
            resolve();
        });

        this.serverPort = await this.getFreePort(this.config.minport, this.config.maxport);

        await this.setupListener();
        await this.setupThreads();

        return promise;
    }


    private async setupListener(): Promise<void> {
        const promise = new Promise<void>((resolve) => {
            this.listener = new Listener(this.config, this.serverPort, this);
            this.listener.init();
            resolve();
        });
        return promise;
    }

    private async setupThreads(): Promise<void> {

        const promise = new Promise<void>(resolve => {
            let port = this.serverPort + 1;
            for (let threadNo = 0; threadNo < this.config.threads; threadNo++) {
                
                this.getFreePort(port, this.config.maxport).then((portIn) => {
                    port = portIn;
                    const thread = new Thread(threadNo, this.config, port, this.serverPort);
                    thread.init();
                    this.threads.push(thread);
                    this.activeThreads++;
                    console.log('start thread:', threadNo, 'at port', portIn);
                }, (err) => {
                    console.log('thread init, error getting port', err);
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

        this.remainingFiles = this.getFiles(this.config.srcroot);

        // this.threads[0].compile(allFiles);
        for (let i = 0; i < this.config.threads; i++) {
            this.compileBatch(i);
        }
    }

    compileBatch(threadNo: number): boolean {

        const filesToCompiles: string[] = [];
        
        for (let i = 0; i < this.config.batchSize; i++) {
            const file = this.remainingFiles.shift();
            if (file) {
                filesToCompiles.push(file);
            }
        }

        // console.log('thread:', threadNo, 'compile batch:', JSON.stringify(filesToCompiles));

        this.threads[threadNo].compile(filesToCompiles);

        return (this.remainingFiles.length > 0);
    }

    getFiles(directory: string): string[] {

        let files = this.readdirSync(directory, ['.p', '.w', '.cls']);
        files = this.normalizeFilenames(files, this.config.srcroot);

        return files;
    }

    private readdirSync(directory: string, filetypes: string[]): Array<string> {

        let files: Array<string> = [];

        const entries = fs.readdirSync(directory, { withFileTypes: true });

        for (let i = 0; i < entries.length; i++) {
            const currentEntry = entries[i];

            if (currentEntry.isDirectory()) {
                files = [...files, ...this.readdirSync(path.join(directory, currentEntry.name), filetypes)];
            }
            else if (currentEntry.isFile() && this.hasExtension(currentEntry.name, filetypes)) {
                files.push(path.join(directory, currentEntry.name));
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

    process4GLresponse(response: { thread: number, status: string }): void {

        if (this.remainingFiles.length > 0) {
            this.compileBatch(response.thread);
        }
        else {
            this.threads[response.thread].kill().then(() => {
                this.activeThreads--;
                if (this.activeThreads == 0) {
                    console.log('all threads closed');
                    process.exit(0);
                }
            });
        }
    }
}
