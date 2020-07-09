import { spawn } from 'child_process';
import { ChildProcessWithoutNullStreams } from 'child_process';
import { Socket } from 'net';
import * as makeDir from 'make-dir';
import path from 'path';
import fs from 'fs';

import { Config } from "./config";

export class Thread {

    state: 'starting' | 'ready' | 'busy' | 'error';

    private prowin: ChildProcessWithoutNullStreams | undefined;
    private directories: string[] = [];

    constructor(private threadNr: number, private config: Config, private port: number, private listenerport: number) {
        this.state = 'starting';
    }

    init(): void {

        const params = [
            '-p', './agent.p',
            '-param'
        ];

        let paramString = 't=' + this.threadNr.toString();
        paramString += ',basedir=' + this.config.targetdir;
        paramString += ',port=' + this.port;
        paramString += ',serverport=' + this.listenerport;

        params.push(paramString);

        for (const param of this.config.startupParameters) {
            params.push(param);
        }

        const executeThis = this.config.dlc + '/bin/' + this.config.executable;

        try {

            this.prowin = spawn(executeThis, params, {
                detached: true,
                shell: true,
                cwd: this.config.workdir
            });

            // this.prowin.stdout.on('data', (data) => {
            //     // console.log(`stdout: ${data}`);
            // });

            this.prowin.stdout.on('data', (data) => {
                console.log(`stderr: ${data}`);
            });

            this.prowin.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
            });

            this.state = 'ready';

        }
        catch (err) {
            this.state = 'error';
        }

    }

    compile(files: Array<string>): void {

        this.state = 'busy';

        this.checkDirectories(files);

        this.sendMessage('application/json', JSON.stringify({
            command: 'compile',
            files: files
        }));
    }

    private checkDirectories(files: Array<string>): void {
        for (let i = 0; i < files.length; i++) {
            const directory = this.getDirectoryName(files[i]);
            if (!this.directories.includes(directory)) {
                this.createDirectory(directory);
                this.directories.push(directory);
            }
        }
    }
    
    private getDirectoryName(file: string): string {
        return file.substring(0, file.lastIndexOf('/'));
    }

    private createDirectory(directory: string): void {
        const fullDirectory = path.join(this.config.targetdir, 't' + this.threadNr, directory);
        // in theory it is possible that a/b is not in this.directories but a/b/c is, so a/b is already created
        if (!fs.existsSync(fullDirectory)) {
            makeDir.sync(fullDirectory);
        }
    }

    async sendMessage(contentType: string, message: string): Promise<void> {

        const promise = new Promise<void>((resolve) => {

            const client = new Socket()
            client.connect(this.port, 'localhost', () => {
                client.write(contentType + '\r\n' + message);
                client.destroy();
                resolve();
            });
        });

        return promise;
    }

    async kill(): Promise<void> {

        const promise = new Promise<void>((resolve) => {
            this.sendMessage('plain/text', 'quit').then(() => {
                resolve();
            });

        });
        return promise;
    }
}
