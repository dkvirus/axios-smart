import { AxiosError } from 'axios'
import { IAxiosSmartOptions } from './iaxios-smart-options'
import { loadingBar } from './loading-bar'

export const defaultOptions: IAxiosSmartOptions = {
    retry: {
        enable: true,
        retries: 2,
        retryDelay: () => 1000,
        retryCondition: (error: AxiosError) => error.response?.status !== 200,
    },
    loading: {
        enable: true,
        start: () => loadingBar.start(),
        done: () => loadingBar.done(),
    },
}

export const mergeOptions = (options?: IAxiosSmartOptions): IAxiosSmartOptions => {
    return {
        retry: {
            ...defaultOptions.retry,
            ...options?.retry,
        },
        loading: {
            ...defaultOptions.loading,
            ...options?.loading,
        },
    }
}