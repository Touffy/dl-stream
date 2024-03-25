![Size](https://badgen.net/bundlephobia/minzip/dl-stream)
![Dependencies](https://badgen.net/bundlephobia/dependency-count/dl-stream)
![Types](https://badgen.net/npm/types/dl-stream)

# What is `dl-stream` ?

`dl-stream` provides a WHATWG Stream for seamlessly queueing many downloads, using an internal queue to keep a few requests going concurrently to (hopefully) stay just ahead of Response consumption without the drawbacks of a greedy `Promise.all` approach.

The result can be consumed as a Stream, or as an AsyncIterable (which will soon be standard for ReadableStreams, but `dl-stream` does it today).

* [Quick Start](#Quick-Start)
* [Compatibility](#Compatibility)
* [Usage](#Usage)
* [Notes](#Notes)

# Quick Start

```sh
npm i dl-stream
```

(or just load the module from a CDN such as [UNPKG](https://unpkg.com/dl-stream/index.js) or [jsDelivr](https://cdn.jsdelivr.net/npm/dl-stream/index.js))

For direct usage with a ServiceWorker's `importScripts`, a [worker.js](https://unpkg.com/dl-stream/worker.js) file is also available alongside the module (it's the same script, just without the `export`).

`dl-stream` was created specifically to improve the performance of [client-zip](https://github.com/Touffy/client-zip) and similar utilities that consume lots of Responses in sequence, so of course it is dead simple to combine them :

```js
import { DownloadStream } from "https://cdn.jsdelivr.net/npm/dl-stream/index.js"
import { downloadZip } from "https://cdn.jsdelivr.net/npm/client-zip/index.js"

const input = [
  'file1.png',
  'file2.png',
  new Request('private.txt', { headers: { Authorization: "It's me !" } })
]
const zipResponse = downloadZip(new DownloadStream(input))
```

# Compatibility

dl-stream works in all modern browsers, Deno and Node.js out of the box. It is an ES2018 module and should not be transpiled any lower.

# Usage

The module exports only this class:
```ts
class DownloadStream extends ReadableStream<Response> implements AsyncIterable<Response> {
  constructor(
    requests: AsyncOrNotIterableOrIterator<RequestInfo>,
    strategy?: QueuingStrategy
  )
}
```

`AsyncOrNotIterableOrIterator` just means *any* kind of iterable/iterator, async or not. So it could be an Array, the result of an async generator, a custom iterator…

The items in `requests` will be passed to `fetch`, so they can be just URLs (as strings), or [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) objects when a simple GET is not enough.

The optional [*strategy*](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/ReadableStream#queuingstrategy) is used to configure the ReadableStream and decides how many requests it can start concurrently ahead of time. By default, a `DownloadStream` will set 3 as its highWaterMark. You can specify a different highWaterMark but you should stay between 1 (when each file's payload takes much longer to process than network latency) and 6.

The `DownloadStream` is both a ReadableStream and an AsyncIterable, so it can be used either way.

If the `DownloadStream` is cancelled or its async iteration is broken by an error, it will immediately abort any ongoing `fetch`. For example, when the `DownloadStream` feeds `downloadZip` which itself feeds a streaming download through a ServiceWorker, cancelling the download should abort any request started by the `DownloadStream`. **There may be uncaught Promise rejections when that happens**, they're safe to ignore.

## Usage with other zip libraries

Of course, client-zip is not the only one that can benefit from a DownloadStream (but it is the only one I know of that handles Responses directly).

[Conflux](https://github.com/transcend-io/conflux) is entirely based on Streams, so you want to keep everything as a Stream but [transform](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream) the Responses into objects that Conflux understands.

```js
const { readable, writable } = new conflux.Writer()
downloadStream.pipeThrough(new TransformStream({
  transform({ body, url, headers }, controller) {
    controller.enqueue({
      name: 'get the filename somehow',
      lastModified: new Date(headers.get('Last-Modified')),
      stream: () => body
    })
  }
}, { highWaterMark: 1 })).pipeTo(writable)
```

(notice that highWaterMark is set to 1 in the TransformStream, any higher is a waste here)

For the other libraries which don't understand streams or async iterables, you will instead have to iterate over the DownloadStream (e.g. using `for await… of` because it's an async iterable too) and add each Response to the archive by calling the appropriate method with the appropriate format.

# Notes

You may be tempted to open the browser's dev tools, to look at the network tab to fine-tune the highWaterMark for your DownloadStream. Unfortunately — as in quantum mechanics — the system behaves differently under observation. Opening the dev tools (in any tab as long as the network tab is recording) will add a fixed overhead to each request.
For a very fast network (latency under 1 millisecond or served from cache) and small files (a few kilobytes each), the time taken by each request may be three times higher than when the dev tools are closed ! (YMMV, this is based onn my own observations on my M1 Pro)
