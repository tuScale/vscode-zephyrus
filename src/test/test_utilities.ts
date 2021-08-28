import { 
    Notification, 
    WebDriver, 
    Workbench
} from 'vscode-extension-tester';

export async function lookUpNotification(driver: WebDriver, withText: string, forTimeout: number = 3000): Promise<Notification> {
    return await driver.wait(async () => {
        const notifications = await new Workbench().getNotifications();

        for (const notification of notifications) {
            const message = await notification.getMessage();
            if (message.indexOf(withText) >= 0) {
                return notification;
            }
        }
        return null;
    }, forTimeout) as Notification;
}