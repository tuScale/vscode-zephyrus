import { readFile } from "fs/promises";
import ZephyrusExtension from "../ZephyrusExtension";

interface ZephyrMatchedVersion {
    major: string,
    minor: string,
    patch: string
}

const VERSION_MATCHER_REGEX = new RegExp([
    'VERSION_MAJOR += +(?<major>\\d+).*',
    'VERSION_MINOR += +(?<minor>\\d+).*',
    'PATCHLEVEL += +(?<patch>\\d+).*'
].join(''), 's');

export default class ZephyrVersion {
    static async loadFor(ze: ZephyrusExtension): Promise<ZephyrVersion> {
        const versionFilePath = `${ze.config.zephyrBase}/VERSION`;
        const versionFileContent = await readFile(versionFilePath, { encoding: 'utf-8' });
        const matchedVersionGroups = versionFileContent.match(VERSION_MATCHER_REGEX)?.groups;
        const matchedVersion = matchedVersionGroups as unknown ?? { major: '?', minor: '?', patch: '?' };

        return new ZephyrVersion(matchedVersion as ZephyrMatchedVersion);
    }

    private constructor(private readonly version: ZephyrMatchedVersion) {}

    toString() {
        return `${this.version.major}.${this.version.minor}.${this.version.patch}`;
    }
}