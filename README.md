# LazyPromise

> A `Promise` subclass that defers its executor until the promise is consumed.

`LazyPromise` lets you describe an asynchronous operation without starting it immediately. The executor runs the first time the instance is consumed through `then()`, `catch()`, `finally()`, or `await`.

The executor runs at most once. Chained results are regular native `Promise` instances.

## Usage

```ts
import LazyPromise from 'lazy-promise';

const result = new LazyPromise<string>((resolve) => {
    console.log('executor started');
    resolve('ready');
});

// Nothing has started yet.

const value = await result;
// Logs: executor started
// value: "ready"
```

The executor is not called when `LazyPromise` is constructed. It starts when the promise is consumed.

## API

### `new LazyPromise<T>(executor)`

Creates a lazy promise.

- `executor` - Function called once when the promise is first consumed.
  - `resolve` - Fulfills the promise with a value or another promise-like value.
  - `reject` - Rejects the promise with an optional reason.

`LazyPromise` has the same fulfillment and rejection behavior as a native `Promise`, but postpones executor execution until consumption.

```ts
const result = new LazyPromise<number>((resolve) => {
    resolve(42);
});

const value = await result;
```

### Promise chaining

`then()`, `catch()`, and `finally()` can be used as with a native promise. Chained results are regular native `Promise` instances rather than additional `LazyPromise` instances.

```ts
const result = new LazyPromise<number>((resolve) => {
    resolve(6);
});

const doubled = result.then((value) => value * 2);

console.log(doubled instanceof Promise); // true
console.log(doubled instanceof LazyPromise); // false
```

### Executor errors

Errors thrown by the executor reject the lazy promise when it is consumed:

```ts
const result = new LazyPromise<never>(() => {
    throw new Error('failed to start');
});

await result.catch((error) => {
    console.error(error.message); // failed to start
});
```

Calling `reject()` has the same effect as with a native promise:

```ts
const result = new LazyPromise<never>((_, reject) => {
    reject(new Error('request failed'));
});

await result.catch((error) => {
    console.error(error.message); // request failed
});
```

## Building a lazy fetch wrapper

`LazyPromise` can be used as the base for a small fluent API. The following wrapper creates the `Request` immediately but defers calling `fetch()` until the response is consumed.

```ts
import LazyPromise from 'lazy-promise';

export class ResponsePromise<T = unknown> extends LazyPromise<Response> {
    private request: Request;

    constructor(request: Request) {
        super((resolve) => resolve(fetch(this.request)));
        this.request = request;
    }

    async json<JsonType = T>(): Promise<JsonType> {
        this.request.headers.set(
            'accept',
            this.request.headers.get('accept') || 'application/json',
        );

        const response = await this;
        return await response.json() as JsonType;
    }
}

export function lazyFetch(
    input: string | Request | URL,
    init?: RequestInit,
): ResponsePromise {
    return new ResponsePromise(new Request(input, init));
}
```

Example usage:

```ts
const user = await lazyFetch('https://api.example.test/user/42')
    .json<{ id: number; name: string }>();

console.log(user.name);
```

The request is prepared when `lazyFetch()` is called, but `fetch()` does not run until `json()`, `await`, or another promise consumer is used.

The response can also be handled with ordinary promise chaining:

```ts
const statusLabel = await lazyFetch('https://api.example.test/health')
    .then((response) => response.status)
    .then((status) => `HTTP ${status}`);

console.log(statusLabel); // HTTP 200
```

The first `then()` starts the fetch. The returned value is a native promise, so the rest of the chain follows standard Promise behavior.
