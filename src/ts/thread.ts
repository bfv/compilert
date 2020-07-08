import { Config } from "./config";
import { spawn } from 'child_process';
import { ChildProcessWithoutNullStreams } from 'child_process';
import { Socket } from 'net';

export class Thread {

    state: 'starting' | 'ready' | 'busy' | 'error';

    private prowin: ChildProcessWithoutNullStreams | undefined;

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

        this.sendMessage('application/json', JSON.stringify({
            command: 'compile',
            files: files
        }));
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
