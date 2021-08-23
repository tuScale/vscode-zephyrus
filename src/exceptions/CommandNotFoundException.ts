export default class CommandNotFoundException {
    public constructor(readonly command: string) {}

    get reason() {
        return `${this.command} command line not found`;
    }
}