'use strict';

import { WorkspaceConfiguration } from 'vscode';
import * as vscode from 'vscode';

import os = require('os');
import rp = require('request-promise-native');
import fs = require('fs');
import tar = require('tar-fs');
import request = require('request');

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

    private getPlatform(): string {
        switch (os.platform()) {
            case "win32":
                return "windows";
                break;
            case "darwin":
                return "macos";
            default:
                return "linux";
                break;
        }
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

    private async unpackFile(source: string, destFolder: string)
    {
        return new Promise((resolve, reject) => {
            fs.createReadStream(source).pipe(tar.extract(destFolder)).on('finish', () => {
                resolve();
            });
        });
    }

    private async determineFilesToUpdate(forceUpdate: boolean)
    {
        // Detect os - darwin, win32 og resten er linux ish
        let platform = this.getPlatform();
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

    private async downloadEntry(element: ManifestEntry)
    {
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
                await this.unpackFile(downloadToPath, unpackToPath);
                console.log(`Untar of ${element.type} completed`);
                this.econtext.globalState.update(element.platform + "_" + element.type, element.sha1hash);
            }
            catch(err)
            {
                console.error("Untar failed");
                console.error(err);
            }
    }

    // Pull changes from server
    public async downloadFilesFromServer(forceUpdate: boolean) {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Update templates for TDT4102",
            cancellable: false
        }, (progress, token) => {
            return new Promise(async (resolve, reject) => 
            {
                progress.report({increment: 0, message: "Determining files to update"});
                const needsUpdate = await this.determineFilesToUpdate(forceUpdate);
                for (const [i, element] of needsUpdate.entries()) {
                    let progress_percent = (90 / needsUpdate.length) * i + 10;
                    progress.report({increment:progress_percent, message: `Updating ${i + 1} of ${needsUpdate.length}`});
                    await this.downloadEntry(element);
                }
                progress.report({increment: 100, message: "Update complete"});
                console.log("Update completed");
                setTimeout(() => resolve(), 2000);
            });
        });
    }
}