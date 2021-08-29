import { assert, expect } from 'chai';
import { 
    NotificationType,  
} from 'vscode-extension-tester';

import ZephyrusExtensionTester from './ZephyrusExtensionTester';

describe('New Board Project Flow', () => {
    let zet: ZephyrusExtensionTester;

    before(() => {
        zet = new ZephyrusExtensionTester();
    });

    it('Triggering a new board project flow should notify with an error if the Zephyr base path could not be deduced', async function() {
        await zet.issueCommand(ZephyrusExtensionTester.NEW_BOARD_PROJECT_COMMAND);

        const notification = await zet.lookUpNotification("Neither the 'ZEPHYR_BASE' environmental");

        expect(await notification.getType()).equals(NotificationType.Error);
        await notification.dismiss();
    });

    it('Triggering a new board project should not notify with an error if ZEPHYR_BASE is set', async function() {
        process.env["ZEPHYR_BASE"] = "/some/path";
        await zet.issueCommand(ZephyrusExtensionTester.NEW_BOARD_PROJECT_COMMAND);

        const notification = await zet.lookUpNotification("Neither the 'ZEPHYR_BASE' environmental");

        assert.isUndefined(notification, 'No notification should be displayed');
    });
});
