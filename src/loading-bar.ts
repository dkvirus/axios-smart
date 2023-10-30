export const loadingBar = {
    _createProgressBar() {
        const bar = document.createElement('div')
        bar.className = 'axios-smart-progress-bar axios-smart-progress-bar-animation'
        document.body.append(bar)
    },
    start() {
        const bar = document.querySelector('.axios-smart-progress-bar')
        if (bar) {
            bar.remove()
            this._createProgressBar()
            return
        }
        this._createProgressBar()
    },
    done() {
        const bar = document.querySelector('.axios-smart-progress-bar') as any
        if (!bar) return
        bar.remove()
    },
}