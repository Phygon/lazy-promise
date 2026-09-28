import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lazyFetch } from './lazy-fetch.ts';

const fetchMock = vi.fn(
    (_input: string | URL | Request, _init?: RequestInit): Promise<Response> =>
        Promise.resolve(new Response()),
);

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("lazyFetch", () => {
    it("defers the request until awaited", async () => {
        fetchMock.mockResolvedValue(new Response("created", { status: 201 }));

        const result = lazyFetch("https://api.example.test/items", {
            method: "POST",
        });

        // lazyFetch() prepares the request; awaiting it triggers the lazy fetch.
        expect(fetchMock).not.toHaveBeenCalled();
        await expect(result.then(({status}) => status)).resolves.toBe(201);
        await expect(result.then((res) => res.text())).resolves.toBe("created");
        expect(fetchMock).toHaveBeenCalledTimes(1);

        const request = fetchMock.mock.calls[0][0] as Request;
        expect(request).toBeInstanceOf(Request);
        expect(request.method).toBe("POST");
    });

    it("sets a default Accept header when json() is called", async () => {
        fetchMock.mockResolvedValue(new Response('{"ok":true}'));

        const result = lazyFetch("https://api.example.test/data")
            .json<{ ok: boolean }>();

        await expect(result).resolves.toEqual({ ok: true });

        const request = fetchMock.mock.calls[0][0] as Request;
        expect(request.headers.get("accept")).toBe("application/json");
    });

    it("preserves a caller-provided Accept header", async () => {
        fetchMock.mockResolvedValue(new Response('{"ok":true}'));

        const result = lazyFetch("https://api.example.test/data", {
            headers: { accept: "application/vnd.example+json" },
        }).json<{ ok: boolean }>();

        await expect(result).resolves.toEqual({ ok: true });

        const request = fetchMock.mock.calls[0][0] as Request;
        expect(request.headers.get("accept")).toBe("application/vnd.example+json");
    });

    it("propagates fetch errors through the promise chain", async () => {
        const error = new Error("Network failure");
        fetchMock.mockRejectedValue(error);

        const result = lazyFetch("https://api.example.test/data")
            .then((response) => response.status);

        await expect(result).rejects.toBe(error);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});