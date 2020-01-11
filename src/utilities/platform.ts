import os = require('os');

export function getPlatformString(): string 
{
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