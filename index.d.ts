type AsyncOrNotIterableOrIterator<T> = Iterable<T> | Iterator<T> | AsyncIterable<T> | AsyncIterator<T>

/** A ReadableStream and AsyncIterable of Responses obtained by fetching the Request or urls in `requests`.
 *  @param requests Any sort of (async or not) iterable or iterator of urls (as strings) or `Request` objects.
 *    Use Requests when you need to specify headers and/or the method is not GET.
 *  @param strategy You should adjust `highWaterMark` based on expected latency and file size,
 *    but keep in mind that Web browsers generally don't do more than 6 concurrent fetches.
 *  @example
 *  with client-zip :
 *  ```js
 *  const input = [
 *    'file1.png',
 *    'file2.png',
 *    new Request('file3.txt', { headers: { Authorization: "It's me !" } })
 *  ]
 *  const zipResponse = downloadZip(new DownloadStream(input))
 *  ```
 */
export class DownloadStream extends ReadableStream<Response> implements AsyncIterable<Response> {
  constructor(
    requests: AsyncOrNotIterableOrIterator<RequestInfo>,
    strategy?: QueuingStrategy<Response>
  )
  [Symbol.asyncIterator](): AsyncIterator<Response>
}
