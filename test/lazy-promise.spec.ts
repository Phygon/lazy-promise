import { describe, expect, it } from 'vitest';
import LazyPromise from '../src/index.ts';

describe("LazyPromise", () => {
    it("does not run the executor when constructed", () => {
        let runs = 0;

        new LazyPromise<void>(() => {
            runs += 1;
        });

        expect(runs).toBe(0);
    });

    it("runs the executor when then() is called and resolves the value", async () => {
        let runs = 0;

        const promise = new LazyPromise<string>((resolve) => {
            runs += 1;
            resolve("done");
        });

        const result = promise.then((value) => value);

        expect(runs).toBe(1);
        await expect(result).resolves.toBe("done");
    });

    it("runs the executor only once when then() is called multiple times", async () => {
        let runs = 0;

        const promise = new LazyPromise<string>((resolve) => {
            runs += 1;
            resolve("done");
        });

        const first = promise.then((value) => value);
        const second = promise.then((value) => `${value}!`);

        expect(runs).toBe(1);
        await expect(first).resolves.toBe("done");
        await expect(second).resolves.toBe("done!");
        expect(runs).toBe(1);
    });

    it("runs the executor when awaited", async () => {
        let runs = 0;

        const promise = new LazyPromise<string>((resolve) => {
            runs += 1;
            resolve("done");
        });

        const result = (async () => await promise)();

        expect(runs).toBe(0);
        await expect(result).resolves.toBe("done");
        expect(runs).toBe(1);
    });

    it("assimilates a promise passed to resolve", async () => {
        const promise = new LazyPromise<number>((resolve) => {
            resolve(Promise.resolve(42));
        });

        await expect(promise).resolves.toBe(42);
    });

    it("rejects when the executor calls reject", async () => {
        const promise = new LazyPromise<never>((_, reject) => {
            reject(new Error("failed"));
        });

        await expect(promise).rejects.toThrow("failed");
    });

    it("rejects when the executor throws", async () => {
        const promise = new LazyPromise<never>(() => {
            throw new Error("executor error");
        });

        await expect(promise).rejects.toThrow("executor error");
    });

    it("returns a regular Promise from then()", () => {
        const promise = new LazyPromise<number>((resolve) => resolve(1));
        const chained = promise.then((value) => value + 1);

        expect(chained).toBeInstanceOf(Promise);
        expect(chained).not.toBeInstanceOf(LazyPromise);
    });
});
