'use strict';

import vscode = require("vscode");

import TemplatesManager from "../projectTemplatesPlugin";
import Tdt4102Manager from "../tdt4102Plugin";

/**
 * Main command to create a file from a template.
 * This command can be invoked by the Command Palette or in a folder context menu on the explorer view.
 * @export
 * @param {TemplatesManager} templatesManager
 * @param {string} storagePath
 * @param {*} args
 * @returns
 */
export async function run(templateManager: TemplatesManager, tdt4102Manager: Tdt4102Manager, force: boolean) {

	// load latest configuration
	templateManager.updateConfiguration(vscode.workspace.getConfiguration('projectTemplates'));
    await tdt4102Manager.downloadFilesFromServer(force);

    await tdt4102Manager.runInstallScript();
}