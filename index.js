export class DownloadStream extends ReadableStream {
  constructor(requests, strategy = { highWaterMark: 3 }, controllerAbortSignal) {
    const promises = []
    const signal = controllerAbortSignal ?? (new AbortController()).signal
    const iterator = 'next' in requests ? requests
    : requests[Symbol.iterator in requests ? Symbol.iterator : Symbol.asyncIterator]()
    super({
      async pull(ctrl) {
        let i = ctrl.desiredSize - promises.length
        while (i--) {
          const { done, value } = await iterator.next()
          if (done) return ctrl.close()
          const promise = fetch(value, { signal: signal })
          promises.push(promise)
        }
        ctrl.enqueue(await promises.shift())
      },
      cancel(e) {
        controller.abort(e)
        iterator.throw?.(e)
      }
    }, strategy)
  }
  [Symbol.asyncIterator]() {
    const reader = this.getReader()
    return {
      next() { return reader.read() },
      throw(e) { reader.cancel(e) }
    }
  }
}
