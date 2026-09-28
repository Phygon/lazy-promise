/**
 * A lazily executed Promise.
 *
 * The supplied executor is not called when the `LazyPromise` is constructed.
 * It runs the first time this promise is consumed; for example, when `then()`
 * is called or when the promise is awaited. The executor runs at most once.
 *
 * Executor errors reject the promise. Chained promises returned by `then()`
 * are regular native `Promise` instances.
 *
 * @template T The type of the value with which this promise fulfills.
 */
export default class LazyPromise<T> extends Promise<T> {
    #hasRun = false;
    #run;

    /**
     * Creates a lazy promise without immediately invoking its executor.
     *
     * @param executor The function that will resolve or reject this promise
     * when it is first consumed.
     */
    constructor(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void) {
        let run: () => void;
        super((resolve, reject) => {
            run = () => {
                try {
                    executor(resolve, reject);
                } catch (error) {
                    reject(error);
                }
            };
        });
        this.#run = run!;
    }

    /**
     * Registers fulfillment and rejection handlers, starting the executor if
     * this is the first time the lazy promise has been consumed.
     *
     * This method also underlies consumption through `await`, as well as
     * inherited methods such as `catch()`.
     *
     * @param onfulfilled Called with the fulfillment value, if provided.
     * @param onrejected Called with the rejection reason, if provided.
     * @returns A regular native `Promise` for the result of the handler.
     */
    then<R1 = T, R2 = never>(
        onfulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
        onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
    ): Promise<R1 | R2> {
        if (!this.#hasRun) {
            this.#hasRun = true;
            this.#run();
        }
        return super.then(onfulfilled, onrejected);
    }

    /**
     * Specifies the constructor used for promises created by inherited Promise
     * methods, such as `then()`. Returning `Promise` ensures chained results
     * are regular native promises rather than `LazyPromise` instances.
     */
    static get [Symbol.species]() {
        return Promise;
    }
}
