import { readFile } from "fs/promises";
import ZephyrusExtension from "../ZephyrusExtension";

export default class ZephyrVersion {
    static async loadFor(ze: ZephyrusExtension): Promise<ZephyrVersion> {
        const versionFilePath = `${ze.zephyrBasePath}/VERSION`;
        const versionFileContent = await readFile(versionFilePath, { encoding: 'utf-8' });
        const found = versionFileContent.match(/VERSION_MAJOR += +(?<major>\d+)/);
        console.log(found!.groups);

        return new ZephyrVersion("1", "2", "3");
    }

    private constructor(readonly major: string, readonly minor: string, readonly patch: string) {}

    toString() {
        return `${this.major}.${this.minor}.${this.patch}`;
    }
}