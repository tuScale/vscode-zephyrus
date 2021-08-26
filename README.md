# Zephyrus

[Zephyr RTOS](https://www.zephyrproject.org/) dev-tools that _hopefully_ aid application development.

`Note`: This project is not affiliated in any way with the official Zephyr one. It's merelly a 3rd party community effort to ease application development through a modern, mainstream IDE for this amazing operating system.

## Features
### Build and flash a Zephyr CMake project
Via 2 customly defined `west` vscode-task types: a `build` one: 
```json
{
    "type": "west",
    "command": "build",
    "label": "west: build project",
    "group": {
        "isDefault": true,
        "kind": "build"
    }
}
```
and a `flash` one:
```json
{
    "type": "west",
    "command": "flash",
    "label": "west: flash"
}
```
Both are automatically defined when generating a new Zephyr project through this extension.

### Generate a new Zephyr project targeting a supported board
Via following the `Zephyr: New board project` command. In the end, you'll end up with a vscode ready Zephyr basic `Hello World!` project similar to the one described on [Zephyr's official Application Development page](https://docs.zephyrproject.org/2.4.0/application/index.html).

## Requirements
In order to use this extension, please make sure you [have your Zephyr development environment](https://docs.zephyrproject.org/2.4.0/getting_started/index.html) properly set up.

This includes:
* having CMake accessible
* installing the `west` meta-tool
* downloading the Zephyr code-base
* having local access to a compiler toolchain

Everything is covered in the above `Getting Started Guide`. It only takes a bit of time and patience to do it.

## Extension Settings

This extension contributes the following settings:

* `zephyrus.zephyr.base`: the Zephyr installation path, similar to the `ZEPHYR_BASE` environmental variable [described here](https://docs.zephyrproject.org/2.4.0/application/index.html#important-build-system-variables)
* `zephyrus.zephyr.board`: the Zephyr target board to use. If globally set, it's the default board used for building a project or generating a new one. If defined locally inside a workspace, it's the board passed to `west` when building that respectful project.

## Known Issues

... nothing of note, but I don't expect it to stay like this for long ...

## Release Notes

### 0.1.0

... pending

## License
[MIT License](LICENSE)

## Feedback and Contributions
Please provide feedback through the [GitHub Issue](https://github.com/tuScale/vscode-zephyrus/issues) system, or, if you want to contribute (**always welcomed**), please fork the repository and submit a PR.