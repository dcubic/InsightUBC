import * as fs from "fs-extra";
import Log from "../Util";

export default class FilePathReader {
    public readAllFiles(currentPath: string): string[] {
        let filePaths: string[] = [];
        const filesInDir = this.attemptDirRead(currentPath);
        for (const fileOrDirName of filesInDir) {
            const fullPath = `${currentPath}/${fileOrDirName}`;
            if (this.isDirectory(fullPath)) {
                filePaths = filePaths.concat(this.readAllFiles(fullPath));
            } else if (fileOrDirName.endsWith(".json")) {
                filePaths.push(fullPath);
            }
        }
        return filePaths;
    }

    private attemptDirRead(currentPath: string): string[] {
        try {
            return fs.readdirSync(currentPath);
        } catch (err) {
            Log.error(`Error reading directory ${currentPath}`);
            throw err;
        }
    }

    // From https://stackoverflow.com/questions/15630770/node-js-check-if-path-is-file-or-directory
    private isDirectory(path: string) {
        try {
            const stat = fs.lstatSync(path);
            return stat.isDirectory();
        } catch (error) {
            return false;
        }
    }
}
