# LazyPromise

> A promise class that defers execution until the promise is consumed, i.e. when it is awaited or when `.then()`, `.catch()`, or `.finally()` is called.

`LazyPromise` is a `Promise` subclass that postpones running its executor. It is useful when an async operation should be described now but started only when a caller asks for its result.

## Usage

```js
import LazyPromise from 'lazy-promise';

const lazyPromise = new LazyPromise((resolve, reject) => {
  setTimeout(resolve, 1000)
});

// `setTimeout` is not yet called

await lazyPromise; // `setTimeout` is called
```

## API

### `new LazyPromise(executor)`

* `executor` - The function that will resolve or reject this promise when it is first consumed.

Same as the [`Promise` constructor](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise). `LazyPromise` is a subclass of `Promise`.

## How it works

A regular `Promise` calls its executor as soon as it is constructed. A `LazyPromise` captures the executor and waits until its first `then()` call. Since `await` consumes a thenable through its `then()` method, awaiting a `LazyPromise` also starts it.

```ts
const result = new LazyPromise<string>((resolve) => {
  resolve("ready");
});

const value = await result; // Starts the executor; value is "ready".
```

## Using it for an async fluent API

A fluent API can wrap an operation in a `LazyPromise`, then expose convenient methods that configure or interpret its result. For example, a lazy fetch wrapper can keep the request dormant until a consumer awaits its response or parsed JSON.

```ts
import { LazyPromise } from "./lazy-promise";

export class ResponsePromise<T = unknown> extends LazyPromise<Response> {
  private request: Request;

  constructor(request: Request) {
    // The executor is deferred, so this.request is assigned before it runs.
    super((resolve) => resolve(fetch(this.request)));
    this.request = request;
  }

  async json<JsonType = T>(): Promise<JsonType> {
    // set Accept header...
    this.request.headers.set(
      'accept',
      this.request.headers.get('accept') || 'application/json'
    );

    // then await to send the request; the response is JSON-parsed and cast as `JsonType`
    const response = await this;
    return await response.json() as Promise<JsonType>;
  }
}

export function lazyFetch(input: string | Request | URL, init?: RequestInit) {
  return new ResponsePromise(new Request(input, init));
}
```

Example use:

```ts
const user = await lazyFetch("https://api.example.test/user/42")
  .json<{ id: number; name: string }>();

console.log(user.name);
```

The request is created when `lazyFetch()` is called, but `fetch()` is deferred until the `ResponsePromise` is consumed. The `json()` method can prepare the request before awaiting the response, then parse the body and return the typed result.

The response itself can also be handled with ordinary promise chaining:

```ts
const statusLabel = await lazyFetch("https://api.example.test/health")
  .then((response) => response.status)
  .then((status) => `HTTP ${status}`);
```

Here, the first `.then()` starts the fetch. Its result is a regular promise, and the remaining chain is standard Promise behavior.
