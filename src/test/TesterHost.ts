import { 
    mkdir, rm
} from "fs/promises";
import { createWriteStream, existsSync } from 'fs';
import { join as joinPath } from "path";
import * as path from "path";
import { exec } from "child_process";
import * as https from 'https';
import { URL } from "url";
import { promisify } from "util";

import * as yauzl from 'yauzl';
import { request as gitHubRequest } from "@octokit/request";

export interface TestingHostDependencyInfo {
    version: string,
    path: string
}
export interface TestingHostDependencies {
    sdk: TestingHostDependencyInfo,
    west: TestingHostDependencyInfo,
    zephyr: TestingHostDependencyInfo
}

function getVersionFrom(ghZephyrReleaseTagName: string) {
    const versionMatchedGroups = ghZephyrReleaseTagName.match(/v(\d+)\.(\d+).(\d+)(?:-rc(\d+))?/) ?? ['?', '0', '0', '0', '0'];

    return parseInt(versionMatchedGroups[1]) * 1000000 + 
        parseInt(versionMatchedGroups[2]) * 10000 +
        parseInt(versionMatchedGroups[3]) * 100 +
        parseInt(versionMatchedGroups[4]);
}

function download(url: string, dest: string) {
    const file = createWriteStream(dest);
    const initialUrl = new URL(url);

    return new Promise<void>((accept, reject) => {
        https.get(initialUrl, {
            headers: { 
                // eslint-disable-next-line @typescript-eslint/naming-convention
                "Host": initialUrl.hostname,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                "User-Agent": "zephyrus-tester"
            } 
        }, function(response: any) {
            const fileLocationURL = new URL(response.headers.location);

            // eslint-disable-next-line @typescript-eslint/naming-convention
            https.get(fileLocationURL, { headers: { "Host": fileLocationURL.hostname } }, (dataResponse: any) => {
                dataResponse.pipe(file);
                dataResponse.on("error", reject);
                dataResponse.on("end", accept);
            }).on("error", reject);
        }).on("error", reject);
    });
}

/**
 * Class used to prepare the host-os to be able to test the extension by provisioning the required dependencies:
 * - west
 * - zephyr project source
 * - zephyr sdk and tooling
 * 
 * TODO: Need to finish this and wire it up. For now, since we don't have a CI environemnt, it's not that urgent.
 */
export default class TesterHost {
    public static readonly LATEST_VERSION = "latest";

    private static readonly RELATIVE_INSTALL_PATH = "test-resources";
    private static readonly RELATIVE_SDK_INSTALL_PATH = "zephyr-sdk";
    private static readonly RELATIVE_WEST_INSTALL_PATH = "py-west-venv";

    // NOTE: be carefull when updating this relative path. After downloading and unpacking it, west zephyr extensions are statically
    //       resolved from the west.yml manifest to this exact 'zephyr' name
    //       see: https://github.com/zephyrproject-rtos/west/blob/129e3431aecf0751132cad43d53b8aa4c467f06b/src/west/app/main.py#L213
    private static readonly RELATIVE_ZEPHYR_INSTALL_PATH = "zephyr";

    public static async newHaving(
        rootPath: string,
        westVersion: string = TesterHost.LATEST_VERSION,
        zephyrVersion: string = TesterHost.LATEST_VERSION,
        sdkVersion: string = TesterHost.LATEST_VERSION
    ) : Promise<TesterHost> {
        // TODO: use provided versions when generating these paths ?
        const installPath = joinPath(rootPath, TesterHost.RELATIVE_INSTALL_PATH);
        const sdkPath = joinPath(installPath, TesterHost.RELATIVE_SDK_INSTALL_PATH);
        const westPyPath = joinPath(installPath, TesterHost.RELATIVE_WEST_INSTALL_PATH);
        const zephyrPath = joinPath(installPath, TesterHost.RELATIVE_ZEPHYR_INSTALL_PATH);
        const westBinPath = `${westPyPath}/bin`;

        console.log("Loading up the tester host.");
        if (this._pathDoesNotExist(westPyPath)) {
            /**
             * TODO: Handle missing 'python3.8-venv' host dependency.
             * 
             * $ python3 -m venv ./py-env
             * The virtual environment was not created successfully because ensurepip is not
             * available.  On Debian/Ubuntu systems, you need to install the python3-venv
             * package using the following command.
             * 
             * apt install python3.8-venv
             * 
             * You may need to use sudo with that command.  After installing the python3-venv
             * package, recreate your virtual environment.
             */
            await exec(`python3 -m venv ${westPyPath}`);

            const westPipInstallString = `${westPyPath}/bin/pip3 install west` + 
                TesterHost.LATEST_VERSION === westVersion ? "" : `===${westVersion}`;
            
            await exec(westPipInstallString);
        }

        if (this._pathDoesNotExist(zephyrPath)) {
            const targetedZephyrInfo = await this._getTargetGitHubRelease({ 
                owner: 'zephyrproject-rtos', 
                repo: 'zephyr'
            }, zephyrVersion);
            const zephyrZipDestination = `${installPath}/zephyr-${targetedZephyrInfo.version}.zip`;
            
            console.log(`Downloading ${targetedZephyrInfo.name} from ${targetedZephyrInfo.zipball_url} into ${installPath} ...`);
            await rm(zephyrZipDestination, { force: true });
            await download(targetedZephyrInfo.zipball_url!, zephyrZipDestination);

            console.log("Unpacking archive ...");
            const openZip = promisify<string, yauzl.Options, yauzl.ZipFile | undefined>(yauzl.open);
            const openedZip = await openZip(zephyrZipDestination, { lazyEntries: true });

            await new Promise<void>((accept) => {
                openedZip?.on("entry", async (entry: yauzl.Entry) => {
                    if (/\/$/.test(entry.fileName)) {
                        openedZip.readEntry();
                    } else {
                        const openReadStream = promisify(openedZip.openReadStream.bind(openedZip));
                        const entryRelativePath = path.dirname(entry.fileName).replace(/^[^\/]+\/|.*/, "");
                        const entryAbsolutePath = `${zephyrPath}/${entryRelativePath}`;
                        const entryFileAttributes = (entry.externalFileAttributes << 4) >> 20;
                        
                        await mkdir(entryAbsolutePath, { recursive: true });

                        const outFile = createWriteStream(`${entryAbsolutePath}/${path.basename(entry.fileName)}`, { 
                            mode: entryFileAttributes === 0 ? undefined : entryFileAttributes
                        });
                        const openedReadStream = await openReadStream(entry);

                        openedReadStream!.on("end", () => { openedZip.readEntry(); });
                        openedReadStream!.pipe(outFile);
                    }
                });
                openedZip?.on("end", async () => {
                    console.log("Cleaning up ...");
                    await exec(`${westBinPath}/west init -l ${zephyrPath}`);
                    await rm(zephyrZipDestination, { force: true });
                    accept(); 
                });
                openedZip?.readEntry();
            });
        }

        if (this._pathDoesNotExist(sdkPath)) {
            const targetedSdkInfo = await this._getTargetGitHubRelease({ 
                owner: 'zephyrproject-rtos', 
                repo: 'sdk-ng'
            }, sdkVersion);
            const sdkRunDestination = `${installPath}/zephyr-sdk.run`;
            const sdkDownloadUrl = targetedSdkInfo.assets.find(asset => {
                const assetName = asset.name;

                // TODO: make this more flexible
                return assetName.includes("x86_64") &&
                    assetName.includes("linux") &&
                    assetName.endsWith("setup.run"); 
            })?.browser_download_url;

            // TODO!

            // console.log(`Downloading '${targetedSdkInfo.name}' from ${sdkDownloadUrl} into ${this.installPath} ...`);
            // await rm(sdkRunDestination, { force: true });
            // await download(sdkDownloadUrl!, sdkRunDestination);

            // console.log("Installing SDK ...");
            // await chmod(sdkRunDestination, "755");
            // await exec(`${sdkRunDestination} --quiet -- -d ${this.sdkPath}`);
            // console.log("Cleaning up ...");
            // await rm(sdkRunDestination, { force: true });
        }

        return new TesterHost({
            sdk: { path: sdkPath, version: sdkVersion },
            west: { path: westBinPath, version: westVersion },
            zephyr: { path: zephyrPath, version: zephyrVersion }
        });
    }

    private static async _getTargetGitHubRelease(coordinate: { owner: string, repo: string }, version: string) {
        const ghReleases = await gitHubRequest('GET /repos/{owner}/{repo}/releases', coordinate);
        const zephyrReleases = ghReleases.data.map(ghRelease => ({
            ...ghRelease,
            version: getVersionFrom(ghRelease.tag_name)
        })).sort((r1, r2) => r2.version - r1.version);
        let targetedReleaseInfo;

        if ('latest' === version) {
            targetedReleaseInfo = zephyrReleases[0];
        } else {
            const numericVersion = getVersionFrom(`v${version}`);

            targetedReleaseInfo = zephyrReleases.find(release => release.version === numericVersion);
        }
        if (!targetedReleaseInfo) {
            console.error(`There is no such release version ${version} available for ${coordinate.owner}/${coordinate.repo}`);
            throw new Error(`Unavailable ${coordinate.repo}-version provided`);
        }

        return targetedReleaseInfo;
    }

    /**
     * TODO: make use of provided dependency versions (eg. westVersion) when computing paths
     */
    private static _pathDoesNotExist(path: string) {
        return !existsSync(path);
    }

    private constructor(
        readonly dependencies: TestingHostDependencies
    ) {}
}