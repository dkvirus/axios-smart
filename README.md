# axios-smart

[![NPM version](https://img.shields.io/npm/v/axios-smart.svg?style=flat)](https://npmjs.org/package/axios-smart)
[![NPM downloads](http://img.shields.io/npm/dm/axios-smart.svg?style=flat)](https://npmjs.org/package/axios-smart)

## Install

```bash
$ yarn install axios-smart
```

## Usage

axios-smart is a collection of small features.

- axios-cancel-repeat

The first time the request is sent, then the query condition is modified so that the second request is sent even though the first request has not yet finished. At this point, the return result of the first request becomes worthless and we should cancel the first request.

Once you use axios-smart, the axios-cancel-repeat feature is automatically available, and you cannot cancel it.

``` js
import axios from 'axios'
import { axiosSmart } from 'axios-smart'

axiosSmart(axios)
```

- axios-cancel-pending

To jump from one page to another, uncompleted requests on the first page should be canceled.

You can customize how to cancel requests in any project.

``` js
import axios from 'axios'
import { axiosSmart, cancelPending } from 'axios-smart'

axiosSmart(axios)

// Cancel all currently pending requests
cancelPending()
```

Here's an example in react:

``` js
import axios from 'axios'
import { axiosSmart, useCancelPendingWhenLeavePage } from 'axios-smart'

/**
 *  useCancelPendingWhenLeavePage(): cancelPending() is also called internally
 * 
 *  useEffect(() => {
 *      return () => {
 *          cancelPending()
 *      }
 *  }, [ window.location.pathname ])
 */
useCancelPendingWhenLeavePage()

axiosSmart(axios)

axios.get('https://httpbin.org/status/503')
```

- axios-retry

Sometimes, due to unstable network, the first request fails, and the second request is successful after refreshing the page.

What axios-retry does is when the request fails, it is automatically resent twice. 

If you do not want to resend the request, you can set it as follows.

``` js
import axios from 'axios'
import { axiosSmart } from 'axios-smart'

axiosSmart(axios, {
    retry: {
        enable: false,       // default value is true
    }
})

axios.get('https://httpbin.org/status/503')
```

retry.retries: Defines the number of retries. The default value is 2

retry.retryCondition: Define the retry condition, the default is that the status code is not equal to 200 will retry

``` js
axiosSmart(axios, {
    retry: {
        enable: true,       // default value is true
        retries: 2,         // default value is 3
        retryCondition: (error: AxiosError) => error.response?.status !== 200,
    }
})
```

- axios-loading

When a request is sent, a progress bar is automatically added at the top of the browser.

If you change the query condition and resent the request, the progress bar will reset and start again.

When all the requests are finished, the progress bar will disappear automatically.

If you don't want this feature, you'll need to turn it off manually.

``` js
import axios from 'axios'
import { axiosSmart } from 'axios-smart'
import 'axios-smart/dist/esm/axios-smart.css'

axiosSmart(axios, {
    loading: {
        enable: false,       // default value is true
    }
})

axios.get('https://httpbin.org/delay/5')
```

You can use the loadingBar alone anywhere

``` js
import { loadingBar } from 'axios-smart'

loadingBar.start()
loadingBar.done()
```

If you need to change the style of the progress bar, you can override these class names directly in the global css file

``` css
.axios-smart-progress-bar {
  position: fixed;
  z-index: 99999999;
  top: 0;
  left: 0;
  height: 3px;
  background-color: #ec7765;
}

.axios-smart-progress-bar-animation {
  animation: axios-smart-progress-bar-loading 60s ease-out;
  animation-fill-mode: forwards;
}

@keyframes axios-smart-progress-bar-loading {
  0% {
    width: 1%;
  }

  100% {
    width: 98%;
  }
}
```

## Development

``` bash
$ git clone git@github.com:dkvirus/axios-smart.git
$ cd axios-smart
$ yarn
$ yarn dev
```

You can modify the source code in the src directory and open test/axios-smart.html to test it.

## LICENSE

MIT
