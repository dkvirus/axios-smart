import axios, { AxiosRequestConfig, AxiosStatic } from 'axios'
import axiosRetry from './axios-retry';

// 存储每个请求中的 map
export const pendingXHRMap = new Map()

// 生成请求键
const generateRequestKey = (config: AxiosRequestConfig & Record<string, any>) => {
    const { method, url } = config
    const key = [
        (method || 'get').toLowerCase(),
        url,
        /**
         * 加上 retryCount 是为了兼容 axios-retry, 否则 axios-retry 会由于 cancel-repeat 不会生效
         */
        config?.['axios-retry']?.retryCount,
    ]
    .filter(item => item)
    .join(':');
    return key
}

// 添加到请求记录
const addPendingXHR = (config: AxiosRequestConfig) => {
    config.cancelToken = config.cancelToken || new axios.CancelToken(cancel => {
        const duplicatedKey = generateRequestKey(config)
        if (duplicatedKey && !pendingXHRMap.has(duplicatedKey)) {
            pendingXHRMap.set(duplicatedKey, cancel)
        }
    })
}

// 删除请求记录
const removePendingXHR = (config: AxiosRequestConfig & Record<string, any>) => {
    const duplicatedKey = generateRequestKey(config)
    if (duplicatedKey && pendingXHRMap.has(duplicatedKey)) {
        const cancel = pendingXHRMap.get(duplicatedKey)
        cancel(duplicatedKey)
        pendingXHRMap.delete(duplicatedKey)
    }
}

export interface IAxiosRetryOptions {
    enable?: boolean;
    retries?: number;
    [key: string]: any;
}

export interface IAxiosHelperOptions {
    /**
     * axios-retry
     */
    retry?: IAxiosRetryOptions;
    [key: string]: any;
}

const axiosSmart = (axios: AxiosStatic, options?: IAxiosHelperOptions) => {
    if (options?.retry?.enable) {
        axiosRetry(axios, { ...options?.retry })
    }

    const requestInterceptorId = axios.interceptors.request.use(
        config => {
            /**
             * 发一个接口, 还没有接收到 response 时发第二个同样的接口, removePendingXHR() 会把第一个接口取消掉
             */
            removePendingXHR(config)
            addPendingXHR(config)
            return config
        },
    )

    const responseInterceptorId = axios.interceptors.response.use(
        response => {
            removePendingXHR(response.config)
            return response
        },
        error => {
            if (axios.isCancel(error)) {
                return new Promise(() => { })
            }
            removePendingXHR(error.response.config)
            return Promise.reject(error)
        },
    )

    return { requestInterceptorId, responseInterceptorId }
}

export const cancelPending = () => {
    pendingXHRMap.forEach((cancel, duplicatedKey) => {
        cancel(duplicatedKey)
    })
    pendingXHRMap.clear()
}

export default axiosSmart
