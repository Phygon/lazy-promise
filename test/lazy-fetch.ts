import LazyPromise from '../src/index.ts';

export class ResponsePromise<T = unknown> extends LazyPromise<Response> {
    private request;

    constructor(request: Request) {
        super((resolve) => resolve(fetch(this.request)));
        this.request = request;
    }

    async json<JsonType = T>() {
        // set Accept header...
        this.request.headers.set('accept', this.request.headers.get('accept') || 'application/json');

        // then await to send the request
        const response = await this;
        return await response.json() as Promise<JsonType>;
    }
}

export function lazyFetch(input: string | Request | URL, init?: RequestInit) {
    return new ResponsePromise(new Request(input, init));
}