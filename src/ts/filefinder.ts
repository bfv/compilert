
import fs from 'fs';

export class FileFinder {

    constructor() {

    }

    getFiles(directory: string, extensions: string[]) {
        const files = fs.readFileSync(directory);
        for(let i = 0; i < files.length; i++) {
            for(let j = 0; j < extensions.length; j++) {

            }
        }
    }
}
