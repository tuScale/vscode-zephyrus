import { 
    VSBrowser, Workbench, WebDriver, 
    Notification
} from 'vscode-extension-tester';
import ZephyrusExtensionTester from '../ZephyrusExtensionTester';

type ZephyrusExtensionCommand = string & { meta: 'Zephyrus Command' };

export default class UIExtensionTester implements ZephyrusExtensionTester {
    public static readonly NEW_BOARD_PROJECT_COMMAND = 'Zephyr: New board project' as ZephyrusExtensionCommand;

    private driver: WebDriver;
    private workbench: Workbench;

    public constructor() {
        this.driver = VSBrowser.instance.driver;
        this.workbench = new Workbench();
    }

    public async issueCommand(what: ZephyrusExtensionCommand) {
        return this.workbench.executeCommand(what);
    }

    public async lookUpNotification(withText: string, forTimeout: number = 3000): Promise<Notification> {
        return await this.driver.wait(async () => {
            const notifications = await this.workbench.getNotifications();
    
            for (const notification of notifications) {
                const message = await notification.getMessage();
                if (message.indexOf(withText) >= 0) {
                    return notification;
                }
            }
            return null;
        }, forTimeout) as Notification;
    }
}