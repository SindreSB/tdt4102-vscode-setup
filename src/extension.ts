'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// import manager
import ProjectTemplatesPlugin from './projectTemplatesPlugin';
import Tdt4102Plugin from './tdt4102Plugin';

import CreateProjectFromTemplateCommand = require('./commands/createProjectFromTemplateCommand');
import RefreshTemplatesCommand = require('./commands/refreshTemplatesCommand');
import RunInstallScriptCommand = require('./commands/runInstallScriptCommand');

/**
 * Main entry point for extension
 * @export
 * @param {vscode.ExtensionContext} context 
 */
export function activate(context: vscode.ExtensionContext) {

    // create manager and initialize template folder
    let projectTemplatesPlugin = new ProjectTemplatesPlugin(context, vscode.workspace.getConfiguration('tdt4102'));
    //projectTemplatesPlugin.createTemplatesDirIfNotExists();
   
    let tdt4102Plugin = new Tdt4102Plugin(context, vscode.workspace.getConfiguration('tdt4102'));
    tdt4102Plugin.createGlobalDirectoryIfNotExist();

    // create project from template
    let createProjectFromTemplate = vscode.commands.registerCommand('extension.createTdt4102ProjectFromTemplate',
        CreateProjectFromTemplateCommand.run.bind(undefined, projectTemplatesPlugin));
    context.subscriptions.push(createProjectFromTemplate);

    // download templates
    let refreshTemplates = vscode.commands.registerCommand('extension.refreshTdt4102Templates', 
        RefreshTemplatesCommand.run.bind(undefined, projectTemplatesPlugin, tdt4102Plugin, false));
    context.subscriptions.push(refreshTemplates);

    // download templates
    let forceRefreshTemplates = vscode.commands.registerCommand('extension.forceRefreshTdt4102Templates', 
        RefreshTemplatesCommand.run.bind(undefined, projectTemplatesPlugin, tdt4102Plugin, true));
    context.subscriptions.push(forceRefreshTemplates);

    let runInstallScript = vscode.commands.registerCommand('extension.runInstallScript',
        RunInstallScriptCommand.run.bind(undefined, projectTemplatesPlugin, tdt4102Plugin, false)
    );
    context.subscriptions.push(runInstallScript);
}

// this method is called when your extension is deactivated
export function deactivate() {
}