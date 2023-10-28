import isRetryAllowed from 'is-retry-allowed';

export const namespace = 'axios-retry';

// 

/**
 * @param  {Error}  error
 * @return {boolean}
 */
export function isNetworkError(error: any) {
  const CODE_EXCLUDE_LIST = ['ERR_CANCELED', 'ECONNABORTED'];

  return (
    !error.response &&
    Boolean(error.code) && // Prevents retrying cancelled requests
    !CODE_EXCLUDE_LIST.includes(error.code) && // Prevents retrying timed out & cancelled requests
    isRetryAllowed(error) // Prevents retrying unsafe errors
  );
}

const SAFE_HTTP_METHODS = ['get', 'head', 'options'];
const IDEMPOTENT_HTTP_METHODS = SAFE_HTTP_METHODS.concat(['put', 'delete']);

/**
 * @param  {Error}  error
 * @return {boolean}
 */
export function isRetryableError(error: any) {
  return (
    error.code !== 'ECONNABORTED' &&
    (!error.response || (error.response.status >= 500 && error.response.status <= 599))
  );
}

/**
 * @param  {Error}  error
 * @return {boolean}
 */
export function isSafeRequestError(error: any) {
  if (!error.config) {
    // Cannot determine if the request can be retried
    return false;
  }

  return isRetryableError(error) && SAFE_HTTP_METHODS.indexOf(error.config.method) !== -1;
}

/**
 * @param  {Error}  error
 * @return {boolean}
 */
export function isIdempotentRequestError(error: any) {
  if (!error.config) {
    // Cannot determine if the request can be retried
    return false;
  }

  return isRetryableError(error) && IDEMPOTENT_HTTP_METHODS.indexOf(error.config.method) !== -1;
}

/**
 * @param  {Error}  error
 * @return {boolean}
 */
export function isNetworkOrIdempotentRequestError(error: any) {
  return isNetworkError(error) || isIdempotentRequestError(error);
}

/**
 * @return {number} - delay in milliseconds, always 0
 */
function noDelay() {
  return 0;
}

/**
 * Set delayFactor 1000 for an exponential delay to occur on the order
 * of seconds
 * @param  {number} [retryNumber=0]
 * @param  {Error}  error - unused; for existing API of retryDelay callback
 * @param  {number} [delayFactor=100] milliseconds
 * @return {number} - delay in milliseconds
 */
export function exponentialDelay(retryNumber = 0, error: any, delayFactor = 100) {
  const delay = Math.pow(2, retryNumber) * delayFactor;
  const randomSum = delay * 0.2 * Math.random(); // 0-20% of the delay
  return delay + randomSum;
}

/**
 * Initializes and returns the retry state for the given request/config
 * @param  {AxiosRequestConfig} config
 * @return {Object}
 */
function getCurrentState(config: any) {
  const currentState = config[namespace] || {};
  currentState.retryCount = currentState.retryCount || 0;
  config[namespace] = currentState;
  return currentState;
}

/**
 * Returns the axios-retry options for the current request
 * @param  {AxiosRequestConfig} config
 * @param  {AxiosRetryConfig} defaultOptions
 * @return {AxiosRetryConfig}
 */
function getRequestOptions(config: any, defaultOptions: any) {
  return { ...defaultOptions, ...config[namespace] };
}

/**
 * @param  {Axios} axios
 * @param  {AxiosRequestConfig} config
 */
function fixConfig(axios: any, config: any) {
  if (axios.defaults.agent === config.agent) {
    delete config.agent;
  }
  if (axios.defaults.httpAgent === config.httpAgent) {
    delete config.httpAgent;
  }
  if (axios.defaults.httpsAgent === config.httpsAgent) {
    delete config.httpsAgent;
  }
}

/**
 * Checks retryCondition if request can be retried. Handles it's retruning value or Promise.
 * @param  {number} retries
 * @param  {Function} retryCondition
 * @param  {Object} currentState
 * @param  {Error} error
 * @return {boolean}
 */
async function shouldRetry(retries: any, retryCondition: any, currentState: any, error: any) {
  const shouldRetryOrPromise = currentState.retryCount < retries && retryCondition(error);

  // This could be a promise
  if (typeof shouldRetryOrPromise === 'object') {
    try {
      const shouldRetryPromiseResult = await shouldRetryOrPromise;
      // keep return true unless shouldRetryPromiseResult return false for compatibility
      return shouldRetryPromiseResult !== false;
    } catch (_err) {
      return false;
    }
  }
  return shouldRetryOrPromise;
}

/**
 * Adds response interceptors to an axios instance to retry requests failed due to network issues
 *
 * @example
 *
 * import axios from 'axios';
 *
 * axiosRetry(axios, { retries: 3 });
 *
 * axios.get('http://example.com/test') // The first request fails and the second returns 'ok'
 *   .then(result => {
 *     result.data; // 'ok'
 *   });
 *
 * // Exponential back-off retry delay between requests
 * axiosRetry(axios, { retryDelay : axiosRetry.exponentialDelay});
 *
 * // Custom retry delay
 * axiosRetry(axios, { retryDelay : (retryCount) => {
 *   return retryCount * 1000;
 * }});
 *
 * // Also works with custom axios instances
 * const client = axios.create({ baseURL: 'http://example.com' });
 * axiosRetry(client, { retries: 3 });
 *
 * client.get('/test') // The first request fails and the second returns 'ok'
 *   .then(result => {
 *     result.data; // 'ok'
 *   });
 *
 * // Allows request-specific configuration
 * client
 *   .get('/test', {
 *     'axios-retry': {
 *       retries: 0
 *     }
 *   })
 *   .catch(error => { // The first request fails
 *     error !== undefined
 *   });
 *
 * @param {Axios} axios An axios instance (the axios object or one created from axios.create)
 * @param {Object} [defaultOptions]
 * @param {number} [defaultOptions.retries=3] Number of retries
 * @param {boolean} [defaultOptions.shouldResetTimeout=false]
 *        Defines if the timeout should be reset between retries
 * @param {Function} [defaultOptions.retryCondition=isNetworkOrIdempotentRequestError]
 *        A function to determine if the error can be retried
 * @param {Function} [defaultOptions.retryDelay=noDelay]
 *        A function to determine the delay between retry requests
 * @param {Function} [defaultOptions.onRetry=()=>{}]
 *        A function to get notified when a retry occurs
 * @return {{ requestInterceptorId: number, responseInterceptorId: number }}
 *        The ids of the interceptors added to the request and to the response (so they can be ejected at a later time)
 */
export default function axiosRetry(axios: any, defaultOptions: any) {
  const requestInterceptorId = axios.interceptors.request.use((config: any) => {
    const currentState = getCurrentState(config);
    currentState.lastRequestTime = Date.now();
    return config;
  });

  const responseInterceptorId = axios.interceptors.response.use(null, async (error: any) => {
    const { config } = error;

    // If we have no information to retry the request
    if (!config) {
      return Promise.reject(error);
    }

    const {
      retries = 3,
      retryCondition = isNetworkOrIdempotentRequestError,
      retryDelay = noDelay,
      shouldResetTimeout = false,
      onRetry = () => {}
    } = getRequestOptions(config, defaultOptions);

    const currentState = getCurrentState(config);

    if (await shouldRetry(retries, retryCondition, currentState, error)) {
      currentState.retryCount += 1;
      const delay = retryDelay(currentState.retryCount, error);

      // Axios fails merging this configuration to the default configuration because it has an issue
      // with circular structures: https://github.com/mzabriskie/axios/issues/370
      fixConfig(axios, config);

      if (!shouldResetTimeout && config.timeout && currentState.lastRequestTime) {
        const lastRequestDuration = Date.now() - currentState.lastRequestTime;
        const timeout = config.timeout - lastRequestDuration - delay;
        if (timeout <= 0) {
          return Promise.reject(error);
        }
        config.timeout = timeout;
      }

      config.transformRequest = [(data: any) => data];

      await onRetry(currentState.retryCount, error, config);

      return new Promise((resolve) => setTimeout(() => resolve(axios(config)), delay));
    }

    return Promise.reject(error);
  });

  return { requestInterceptorId, responseInterceptorId };
}

// Compatibility with CommonJS
axiosRetry.isNetworkError = isNetworkError;
axiosRetry.isSafeRequestError = isSafeRequestError;
axiosRetry.isIdempotentRequestError = isIdempotentRequestError;
axiosRetry.isNetworkOrIdempotentRequestError = isNetworkOrIdempotentRequestError;
axiosRetry.exponentialDelay = exponentialDelay;
axiosRetry.isRetryableError = isRetryableError;
