import { readFile } from "fs/promises";
import ZephyrusExtension from "../ZephyrusExtension";

// TODO: this needs to be worked at and used ... currently it's not
export default class ZephyrVersion {
    static async loadFor(ze: ZephyrusExtension): Promise<ZephyrVersion> {
        const versionFilePath = `${ze.config.zephyrBase}/VERSION`;
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