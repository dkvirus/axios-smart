import { AxiosRequestConfig } from 'axios'

export interface IAxiosRetryOptions {
    enable?: boolean;
    retries?: number;
    [key: string]: any;
}

export interface IAxiosLoadingOptions {
    enable?: boolean;
    start?: () => void;
    done?: () => void;
}

export interface IAxiosSmartOptions {
    /**
     * axios-retry
     */
    retry?: IAxiosRetryOptions;
    /**
     * axios-loading
     */
    loading?: IAxiosLoadingOptions;
    [key: string]: any;
}

export type RequestConfig = AxiosRequestConfig & Record<string, any>

// 扩展 axios/AxiosRequestConfig 属性
declare module 'axios' {
    export interface AxiosRequestConfig {
      cancelRepeatId?: string;
      cancelRepeat?: boolean;
    }
}
