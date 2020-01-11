'use strict';

import { WorkspaceConfiguration } from 'vscode';
import * as vscode from 'vscode';

import rp = require('request-promise-native');
import fs = require('fs');
import request = require('request');
import child_process = require('child_process');

import './utilities/fsutils';
import { getPlatformString } from './utilities/platform';
import { extractTarArchive } from './utilities/fsutils';

class ManifestEntry {
    platform: string;
    type: string;
    sha1hash: string;

    constructor(platform: string, type: string, sha1hash: string) {
        this.platform = platform;
        this.type = type;
        this.sha1hash = sha1hash;
    }
}

export default class Tdt4102Plugin {

    /**
     * local copy of workspace configuration to maintain consistency between calls
     */
    config: WorkspaceConfiguration;
    econtext: vscode.ExtensionContext;

    constructor(econtext: vscode.ExtensionContext, config: WorkspaceConfiguration) {
        this.config = config;
        this.econtext = econtext;
    }

    // Below are comments indicating functions that needs to be implemented

    // Create global directory if not present
    public async createGlobalDirectoryIfNotExist() {
        let storagePath = this.econtext.globalStoragePath;
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(storagePath));
    }

    private async getManifest(): Promise<ManifestEntry[]> {
        const fileInfoUri = "https://gitlab.stud.idi.ntnu.no/tdt4102/vs-code/resources/raw/master/manifest.txt";
        var options = {
            uri: fileInfoUri,
            headers: {
                'User-Agent': 'Request-Promise'
            }
        };

        let manifest_data: ManifestEntry[] = [];
        const result: string = await rp(options);
        result.split('\n').forEach(element => {
            let line_data = element.split(' ');
            manifest_data.push(new ManifestEntry(line_data[0], line_data[1], line_data[2]));
        });

        return manifest_data;
    }

    private async downloadFile(sourceName: string, downloadToPath: string) {
        return new Promise((resolve, reject) => {
            //Download tar file to global store
            let downloadUrl = `https://gitlab.stud.idi.ntnu.no/api/v4/projects/2977/repository/files/${sourceName}/raw?ref=master`;
            request(downloadUrl).pipe(fs.createWriteStream(downloadToPath)).on('close', () => {
                resolve();
            });
        });
    }

    private async determineFilesToUpdate(forceUpdate: boolean): Promise<ManifestEntry[]> {
        let platform = getPlatformString();
        const manifest = await this.getManifest();

        // Select lines from manifest
        const relevant_manifest = manifest.filter((value) => value.platform === platform);

        // Compare against values in store. Simply concat them as keys
        if (forceUpdate) {
            return relevant_manifest;
        }
        else {
            return relevant_manifest.filter((entry) => {
                const stored_hash = this.econtext.globalState.get(entry.platform + "_" + entry.type, "");
                return entry.sha1hash !== stored_hash;
            });
        }
    }

    private async downloadEntry(element: ManifestEntry) {
        let sourceName = `${element.platform}_${element.type}.tar`;
        let targetName = `${element.type}`;
        let downloadToPath = this.econtext.globalStoragePath + `/${targetName}.tar`;
        let unpackToPath = this.econtext.globalStoragePath + `/${targetName}`;

        await this.downloadFile(sourceName, downloadToPath);
        console.log(`File ${sourceName} downloaded`);

        // Delete the old
        try {
            await vscode.workspace.fs.delete(vscode.Uri.file(unpackToPath), {
                recursive: true,
                useTrash: false
            });
        } catch (error) {
            console.error('Could not delete old folder. Might not have existed');
            console.error(error);
        }

        // Unpack it
        try {
            await extractTarArchive(downloadToPath, unpackToPath);
            console.log(`Untar of ${element.type} completed`);
            this.econtext.globalState.update(element.platform + "_" + element.type, element.sha1hash);
        }
        catch (err) {
            console.error("Untar failed");
            console.error(err);
        }
    }

    // Pull changes from server
    public async downloadFilesFromServer(forceUpdate: boolean) {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Update TDT4102",
            cancellable: false
        }, (progress, token) => {
            return new Promise(async (resolve, reject) => {
                progress.report({ increment: 0, message: "Determining files to update" });
                const needsUpdate = await this.determineFilesToUpdate(forceUpdate);
                for (const [i, element] of needsUpdate.entries()) {
                    let progress_percent = (90 / needsUpdate.length) * i + 10;
                    progress.report({ increment: progress_percent, message: `Updating ${i + 1} of ${needsUpdate.length}` });
                    await this.downloadEntry(element);
                }
                progress.report({ increment: 100, message: "Update complete" });
                console.log("Update completed");
                setTimeout(() => resolve(), 2000);
            });
        });
    }

    /************************************************************
     * 
     * 
     * HEALTHCHECK
     * 
     * 
     ***********************************************************/

    private async windowsInstallBuildTools(): Promise<void> {
        return new Promise((resolve, reject) => {
            const globalDir = this.econtext.globalStoragePath;
            const installScriptLocation = "\\install";
            const installScriptName = "vs_buildtools_install.bat";
            const ls = child_process.spawn("cmd.exe", ['/c', "cd", globalDir + installScriptLocation, "&&", installScriptName]);

            ls.stdout.on('data', (data: string) => {
                console.log(`stdout: ${data}`);
            });

            ls.stderr.on('data', (data: string) => {
                console.error(`stderr: ${data}`);
            });

            ls.on('close', (code: string) => {
                console.log(`child process exited with code ${code}`);
                // Write to config that this has succeeded once, so we can skip it later
                this.econtext.globalState.update("BUILD_TOOLS", true);
                resolve();
            });
        });
    }

    private async windowsCopyHandoutCode(): Promise<void> {
        return new Promise((resolve, reject) => {
            const globalDir = this.econtext.globalStoragePath;
            const installScriptLocation = globalDir + "\\install";
            const installScriptName = "copy_tdt4102.bat";
            const argumentList = `@("/c","cd","${installScriptLocation}","&&","${installScriptName}")`;
            const ls = child_process.spawn("powershell", ["Start-Process", "cmd.exe", "-Verb", "runAs", "-ArgumentList", argumentList, "-Wait"]);

            ls.stdout.on('data', (data: string) => {
                console.log(`stdout: ${data}`);
            });

            ls.stderr.on('data', (data: string) => {
                console.error(`stderr: ${data}`);
            });

            ls.on('close', (code: string) => {
                console.log(`child process exited with code ${code}`);
                resolve();
            });
        });
    }

    private async windowsCopyShortcut(): Promise<void> {
        return new Promise((resolve, reject) => {
            const globalDir = this.econtext.globalStoragePath;
            const installScriptLocation = globalDir + "\\install";
            const installScriptName = "copy_tdt4102.bat";
            const argumentList = `@("/c","cd","${installScriptLocation}","&&","xcopy","\"TDT 4102 - VS Code.lnk\"","\"%AppData%\\Microsoft\\Windows\\Start Menu\\Programs\"")`;
            const ls = child_process.spawn("powershell", ["Start-Process", "cmd.exe", "-Verb", "runAs", "-ArgumentList", argumentList, "-Wait"]);

            ls.stdout.on('data', (data: string) => {
                console.log(`stdout: ${data}`);
            });

            ls.stderr.on('data', (data: string) => {
                console.error(`stderr: ${data}`);
            });

            ls.on('close', (code: string) => {
                console.log(`child process exited with code ${code}`);
                resolve();
            });
        });
    }

    private async runInstallWindows() {
        // First check build tools -> nope, it will just assert it's there
        // But this takes time, so a quicker check would be nice
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Installing prerequisites",
            cancellable: false
        }, async (progress, token) => {
            progress.report({ increment: 0, message: "Handout from book" });
            await this.windowsCopyHandoutCode();

            progress.report({ increment: 50, message: "Build tools" });
            await this.windowsInstallBuildTools();

            progress.report({ increment: 90, message: "Shortcut" });
            await this.windowsCopyShortcut();

            progress.report({ increment: 100, message: "Completed" });
            return new Promise((resolve, reject) => {
                setTimeout(() => resolve(), 2000);
            });
        });
    }

    public async runInstallScript() {
        switch (getPlatformString()) {
            case "windows":
                await this.runInstallWindows();
                break;
            default:
                console.error("Platform unsupported");
                break;
        }
    }

    /************************************************************
     * 
     * 
     * HEALTHCHECK
     * 
     * 
     ***********************************************************/

    public async runHealthcheck() {

    }
}