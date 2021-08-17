import { 
    mkdir,
    writeFile
} from "fs/promises";
import Board from "./models/Board";

const MAIN_C_SRC = `#include <zephyr.h>
#include <sys/printk.h>

void main(void) {
	printk("Hello World! %s", CONFIG_BOARD);
}`;

const CMAKE_LISTS_TEMPLATE = `# Find Zephyr. This also loads Zephyr's build system.
cmake_minimum_required(VERSION 3.13.1)
find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})

project({{zephyrus_project_name}})

# Add your source file to the "app" target. This must come after
# find_package(Zephyr) which defines the target.
target_sources(app PRIVATE src/main.c)`;

const PRJ_CONF_CONTENT = "# nothing here";

const PRJ_VSCODE_TASKS = `{
	"version": "2.0.0",
	"tasks": [
		{
			"type": "west",
			"command": "build",
			"label": "west: build project",
            "group": {
				"isDefault": true,
				"kind": "build"
			}
		},
        {
            "type": "west",
			"command": "flash",
			"label": "west: flash"
        }
	]
}`;

// TODO: use this in an intelligent manner (don't release until then!)
const PRJ_VSCODE_SETTINGS = `{
    "zephyrus.zephyr.board": "{{zephyr_project_selected_board}}"
}`;

export default class ZephyrProjectCreator {
    public static async create(prjBase: string, prjName: string, prjBoard: Board) {
        const newProjectRootPath = `${prjBase}/${prjName}`;

        try {
            // Create the required directories
            await mkdir(`${newProjectRootPath}/.vscode`, { recursive: true });
            await mkdir(`${newProjectRootPath}/src`, { recursive: true });
        
            // Add in the minimum project files
            await writeFile(`${newProjectRootPath}/prj.conf`, PRJ_CONF_CONTENT);
            await writeFile(`${newProjectRootPath}/src/main.c`, MAIN_C_SRC);
            await writeFile(`${newProjectRootPath}/CMakeLists.txt`, CMAKE_LISTS_TEMPLATE
                .replace("{{zephyrus_project_name}}", prjName));

            // Plug in the vscode stuff (eg. tasks and/or settings)
            await writeFile(`${newProjectRootPath}/.vscode/tasks.json`, PRJ_VSCODE_TASKS);
            await writeFile(`${newProjectRootPath}/.vscode/settings.json`, PRJ_VSCODE_SETTINGS
                .replace("{{zephyr_project_selected_board}}", prjBoard.name));
        } catch(e) {
            if (e.code === 'EEXIST') {
                // TODO: a/some directories already exists. Now what? 
                //       We need to let the user know that this is the case otherwise we might overwrite something
            }
        }
    }
}