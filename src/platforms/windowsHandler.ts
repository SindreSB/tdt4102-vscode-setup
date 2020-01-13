'use strict'

import { WorkspaceConfiguration } from 'vscode';
import * as vscode from 'vscode';

import rp = require('request-promise-native');
import fs = require('fs');
import request = require('request');
import child_process = require('child_process');

import './utilities/fsutils';
import { getPlatformString } from './utilities/platform';
import { extractTarArchive } from './utilities/fsutils';
import {PlatformHandler} from './handler';

export class WindowsHandler implements PlatformHandler 
{
        /**
     * local copy of workspace configuration to maintain consistency between calls
     */
    config: WorkspaceConfiguration;
    econtext: vscode.ExtensionContext;

    constructor(econtext: vscode.ExtensionContext, config: WorkspaceConfiguration) {
        this.config = config;
        this.econtext = econtext;
    }

    UpdateHandoutCode(): Promise<void> {
        throw new Error("Method not implemented.");
    }    
    
    UpdateTemplates(): Promise<void> {
        throw new Error("Method not implemented.");
    }


}