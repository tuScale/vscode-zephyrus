import { exec }  from 'child_process';
import { CancellationToken } from 'vscode';

export type ZephrExtensionCommand = "boards" | "build" | "flash";

export default class WestExecutor {
    public static async new(cancelToken: CancellationToken) : Promise<WestExecutor> {
        const westVersionChecker = new Promise<WestExecutor>((accept, reject) => {
            exec('west --version', (err, stdout, _) => {
                if (err) {
                    if (err.code === 127) {
                        reject();
                    }
                } else {
                    const westVersionMatcherRegex = /West version: (.*)/i;
                    const westVersionMatchedGroups = stdout.match(westVersionMatcherRegex) || [];
                    const westMatchedVersion = westVersionMatchedGroups.length > 1 ? westVersionMatchedGroups[1] : 'unknown';

                    accept(new WestExecutor({ version: westMatchedVersion }));
                }
            });
        });
        const cancelTokenPromise = new Promise<WestExecutor>((_, reject) => {
            cancelToken.onCancellationRequested(reject);
        });

        return Promise.race([ westVersionChecker, cancelTokenPromise ]);
    }

    readonly version: string;

    private constructor({ version } : { version: string }) {
        this.version = version;
    }

    public execute(command: ZephrExtensionCommand, params: string = ""): Promise<String> {
        const fullCLICommand = `west ${command} ${params}`;

        return new Promise((accept, reject) => {
            exec(fullCLICommand, (err, stdout, _) => {
                if (err) {
                    reject(err);
                } else {
                    accept(stdout);
                }
            });
        });
    }
}