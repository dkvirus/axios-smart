# axios-helper

[![NPM version](https://img.shields.io/npm/v/axios-helper.svg?style=flat)](https://npmjs.org/package/axios-helper)
[![NPM downloads](http://img.shields.io/npm/dm/axios-helper.svg?style=flat)](https://npmjs.org/package/axios-helper)

## Install

```bash
$ yarn install axios-smart
```

## Usage

The following functions are built-in, If a feature is not needed, it can be turned off in the configuration.
- axiosRetry: The request is automatically resent when it fails.
- axiosCancelRepeat: If two requests are the same, cancel the previous request and keep the latest one.
- axiosCancelPending: You can cancel all pending requests. When you jump from page a to page b, the pending request from page a is meaningless.

``` js
import axios from 'axios'
import { axiosSmart } from 'axios-smart'

axiosSmart(axios, {
    retry: {
        enable: true,       // default value is false
        retries: 2,         // default value is 3
        retryCondition: (error: AxiosError) => error.response?.status !== 200,
    }
})

axios.get('https://httpbin.org/status/503')

axios.get('https://httpbin.org/delay/5')        // cancel repeat
axios.get('https://httpbin.org/delay/5')
```

## LICENSE

MIT
