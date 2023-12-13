import axios, { AxiosStatic } from 'axios'
import { useEffect } from 'react'
import axiosRetry from './axios-retry';
import { IAxiosSmartOptions, RequestConfig } from './iaxios-smart-options'
import { mergeOptions } from './options';
import { loadingBar } from './loading-bar';

// 存储每个请求中的 map
export const pendingXHRMap = new Map()

const uuid = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

// 生成请求键
const generateRequestKey = (config: RequestConfig, includeRetryCount = true) => {
    const { method, url } = config
    let cancelRepeatId = config?.cancelRepeatId || ''
    if (config?.cancelRepeat) {
        cancelRepeatId = uuid()
    }
    const key = [
        (method || 'get').toLowerCase(),
        url,
        /**
         * 加上 retryCount 是为了兼容 axios-retry, 否则 axios-retry 会由于 cancel-repeat 不会生效
         */
        includeRetryCount ? config?.['axios-retry']?.retryCount : '',
        cancelRepeatId,
    ]
    .filter(item => item)
    .join(':');
    return key
}

// 添加到请求记录
const addPendingXHR = (config: RequestConfig, options: IAxiosSmartOptions) => {
    config.cancelToken = config.cancelToken || new axios.CancelToken(cancel => {
        const duplicatedKey = generateRequestKey(config)
        if (!duplicatedKey || pendingXHRMap.has(duplicatedKey)) return
        pendingXHRMap.set(duplicatedKey, cancel)
        if (options.loading?.enable) {
            options.loading.start?.()
        }
    })
}

// 删除请求记录
const removePendingXHR = (config: RequestConfig, options: IAxiosSmartOptions, includeRetryCount = true) => {
    const duplicatedKey = generateRequestKey(config, includeRetryCount)
    if (duplicatedKey && pendingXHRMap.has(duplicatedKey)) {
        const cancel = pendingXHRMap.get(duplicatedKey)
        cancel(duplicatedKey)
        pendingXHRMap.delete(duplicatedKey)
        if (pendingXHRMap.size === 0 && options.loading?.enable) {
            options.loading.done?.()
        }
    }
}

const axiosSmart = (axios: AxiosStatic, options?: IAxiosSmartOptions) => {
    const opts = mergeOptions(options) 

    if (opts?.retry?.enable) {
        axiosRetry(axios, { ...opts?.retry })
    }

    const requestInterceptorId = axios.interceptors.request.use(
        config => {
            /**
             * 发一个接口, 还没有接收到 response 时发第二个同样的接口, removePendingXHR() 会把第一个接口取消掉
             */
            removePendingXHR(config, opts)
            addPendingXHR(config, opts)
            return config
        },
    )

    const responseInterceptorId = axios.interceptors.response.use(
        response => {
            removePendingXHR(response.config, opts)
            return response
        },
        error => {
            if (axios.isCancel(error)) {
                return new Promise(() => { })
            }
            removePendingXHR(error.response.config, opts, false)
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
    loadingBar.done()
}

export const useCancelPendingWhenLeavePage = () => {
    useEffect(() => {
        return () => {
          cancelPending()
        }
    }, [ window.location.pathname ])
}

export default axiosSmart
