import { CancellationToken, Progress } from "vscode";
import UserCancelledFlowException from "./exceptions/UserCancelledFlowException";
import Board from "./models/Board";
import ZephyrVersion from "./models/ZephyrVersion";
import WestExecutor, { WestCommand } from "./WestExecutor";
import ZephyrusExtension from "./ZephyrusExtension";

export type ProgressableTask<R> = (progress: Progress<{ message?: string; increment?: number }>, token: CancellationToken) => Promise<R>;

export default class ZephyrBuildRuntime {
    public static async initialize(ze: ZephyrusExtension) : Promise<ProgressableTask<ZephyrBuildRuntime>> {
        return async (_progress, cancelToken) => {
            const userCancelledFlowPromise = new Promise<ZephyrBuildRuntime>((_accept, reject) => {
                cancelToken.onCancellationRequested(() => {
                    reject(new UserCancelledFlowException('User cancelled the build-runtime check-up.'));
                });
            });
            const westExecutor = await WestExecutor.new(ze, cancelToken);
            const boardsCommandResult = await (westExecutor.execute(WestCommand.BOARDS) as Promise<String>);
            const availableBoardNames = boardsCommandResult.split('\n').filter(entry => entry.length !== 0);
            const availableBoards = await Promise.all(availableBoardNames.map(name => Board.newFor(name)));
            const zephyrVersion = await ZephyrVersion.loadFor(ze);
            const zephyrBuildRuntimePromise = Promise.resolve(new ZephyrBuildRuntime(
                availableBoards, zephyrVersion, westExecutor, ze
            ));

            return Promise.race([userCancelledFlowPromise, zephyrBuildRuntimePromise]);
        };
    }

    private constructor(
        readonly boards: Board[],
        private readonly version: ZephyrVersion,
        readonly west: WestExecutor,
        private readonly ze: ZephyrusExtension) {}
}