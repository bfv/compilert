
import express from 'express';
import bodyParser from 'body-parser';

import { Config } from "./config";
import { Response4GL } from './serverprocess';

export class Listener {

    app: express.Express;

    constructor(private config: Config, private port: number, private server: Response4GL) {
        console.log('starting listener');
        this.app = express();
    }

    init(): void {

        this.app.use(bodyParser.json());

        this.app.post('/', (req, res) => {
            const body = <{ thread: number, status: string }>req.body;
            this.server.process4GLresponse(body);

            res.setHeader('Content-Type', 'text/plain');
            res.status(200);
            res.end('OK');
            res.destroy();
        });

        this.app.listen(this.port, () => {
            console.log(`server started at http://localhost:${this.port}`);
        });
    }
}