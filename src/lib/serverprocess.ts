import del from 'del';
import getPort from 'get-port';
import fs from 'fs';
import fse from 'fs-extra';
import path from 'path';

import { OecConfig } from './config';
import { Thread } from './thread';
import { Listener } from './listener';

export interface Response4GLMessage {
    thread: number,
    filecount: number,
    status: string,
    errors?: [{ file: string, error: string }]
}

export interface Response4GL {
    process4GLresponse(response: Response4GLMessage): void;
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
    private fileCount = 0;
    private compiledFiles = 0;
    private errorCount = 0;
    private activeThreads = 0;
    private startTime = 0;

    constructor(private config: OecConfig) {
        // this.init();
    }

    async init(): Promise<void> {

        this.startTime = new Date().getTime();

        // if a Promise is not set up and returned this will not get executed
        const promise = new Promise<void>((resolve) => {
            resolve();
        });

        const targetDir = path.join(this.config.targetdir, '.oec');
        if (fs.existsSync(targetDir)) {
            fs.rmdirSync(targetDir, { recursive: true });
        }
        fse.mkdirSync(targetDir, { recursive: true });

        if (this.config.deletercode) {
            await del(this.config.targetdir + '/**/*.r');
        }

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
                    if (this.config.verbose) {
                        console.log('start thread:', threadNo, 'at port', portIn);
                    }
                }, (err) => {
                    console.error('thread init, error getting port', err);
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

        this.remainingFiles = this.getFiles(this.config.srcroot);
        this.fileCount = this.remainingFiles.length;

        for (let i = 0; i < this.config.threads; i++) {
            this.compileBatch(i);
        }
    }

    compileBatch(threadNo: number): boolean {

        const filesToCompiles: string[] = [];

        for (let i = 0; i < this.config.batchsize; i++) {
            const file = this.remainingFiles.shift();
            if (file) {
                filesToCompiles.push(file);
            }
        }

        this.threads[threadNo].compile(filesToCompiles);

        return (this.remainingFiles.length > 0);
    }

    getFiles(directory: string): string[] {

        let files = this.readdirSync(directory, ['.p', '.w', '.cls']);
        files = this.normalizeFilenames(files, this.config.basedir);

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

    process4GLresponse(response: Response4GLMessage): void {

        if (response.errors) {
            for (let i = 0; i < response.errors.length; i++) {
                console.error('ERROR:', response.errors[i].file, ':', response.errors[i].error);
            }
            this.errorCount += response.errors.length;
        }

        this.compiledFiles += response.filecount;

        if (this.config.counter && this.compiledFiles > 0) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        }

        if (this.config.counter) {
            process.stdout.write(`compiled ${this.compiledFiles}/${this.fileCount}, errors: ${this.errorCount}`);
        }

        if (this.remainingFiles.length > 0) {
            this.compileBatch(response.thread);
        }
        else {
            this.threads[response.thread].kill().then(() => {
                this.activeThreads--;
                if (this.activeThreads == 0) {
                    if (this.config.verbose) {
                        console.log('all threads closed');
                    }
                    this.consolidate();
                    process.exit(
                        this.errorCount == 0 ? 0 : 2
                    );
                }
            });
        }
    }

    private consolidate() {
        for (let i = 0; i < this.config.threads; i++) {
            fse.copySync(path.join(this.config.targetdir, '.oec', 't' + i.toString()), this.config.targetdir);
        }
    }
}
