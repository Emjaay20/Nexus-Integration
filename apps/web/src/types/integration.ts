export type IntegrationStatus = 'healthy' | 'warning' | 'error';
export type LogStatus = 'success' | 'failure' | 'retrying' | 'recovered';

export interface IntegrationConfig {
    id: string;
    name: string;
    source: string;
    destination: string;
    status: IntegrationStatus;
    lastRun: string;
    uptime: string;
}

export interface IntegrationLog {
    id: number | string;
    event: string;
    integration: string;
    time: string; // In a real app this would be a Date object or ISO string
    status: LogStatus;
    duration?: string;
    description?: string;
    error?: {
        name: string;
        message: string;
        code: string;
    };
    payload?: string; // JSON string
    response?: {
        status: number;
        statusText: string;
        headers: Record<string, string>;
    };
}
