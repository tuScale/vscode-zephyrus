export default class Board {
    public static readonly NO_BOARD: Board = new Board("None");
    public static readonly UNKNOWN_BOARD: Board = new Board("Unknown");

    public static async newFor(code: string | undefined) {
        // TODO: validate board code
        return code ? new Board(code) : Board.NO_BOARD;
    }

    private constructor(readonly name: string) {}

    public isDefined() {
        return this.name !== Board.NO_BOARD.name && this.name !== Board.UNKNOWN_BOARD.name;
    }
}