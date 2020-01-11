'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// import manager
import ProjectTemplatesPlugin from './projectTemplatesPlugin';
import Tdt4102Plugin from './tdt4102Plugin';

import CreateProjectFromTemplateCommand = require('./commands/createProjectFromTemplateCommand');
import RefreshTemplatesCommand = require('./commands/refreshTemplatesCommand');

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
    // register commands

    // open templates folder
    // let openTemplatesFolder = vscode.commands.registerCommand('extension.openTemplatesFolder', 
    //     OpenTemplatesFolderCommand.run.bind(undefined, projectTemplatesPlugin));
    // context.subscriptions.push(openTemplatesFolder);
    
    // save as template
    // let saveProjectAsTemplate = vscode.commands.registerCommand('extension.saveProjectAsTemplate', 
    //     SaveProjectAsTemplateCommand.run.bind(undefined, projectTemplatesPlugin));
    // context.subscriptions.push(saveProjectAsTemplate);

    // delete template
    // let deleteTemplate = vscode.commands.registerCommand('extension.deleteTemplate', 
    //     DeleteTemplateCommand.run.bind(undefined, projectTemplatesPlugin));
    // context.subscriptions.push(deleteTemplate);

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
}

// this method is called when your extension is deactivated
export function deactivate() {
}