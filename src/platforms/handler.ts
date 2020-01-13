

export interface PlatformHandler
{
    UpdateHandoutCode(): Promise<void>;
    UpdateTemplates(): Promise<void>;
}