import { PassThrough, Transform, Readable } from 'stream';
import type { EntryContext } from '@remix-run/node';
import { Response } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import isbot from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import { dehydrate, Hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';

const ABORT_DELAY = 5000;

export default function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	remixContext: EntryContext
) {
	return isbot(request.headers.get('user-agent'))
		? handleBotRequest(request, responseStatusCode, responseHeaders, remixContext)
		: handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext);
}

function handleBotRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	remixContext: EntryContext
) {
	return new Promise((resolve, reject) => {
		let didError = false;

		const { pipe, abort } = renderToPipeableStream(<RemixServer context={remixContext} url={request.url} />, {
			onAllReady() {
				const body = new PassThrough();

				responseHeaders.set('Content-Type', 'text/html');

				resolve(
					new Response(body, {
						headers: responseHeaders,
						status: didError ? 500 : responseStatusCode,
					})
				);

				pipe(body);
			},
			onShellError(error: unknown) {
				reject(error);
			},
			onError(error: unknown) {
				didError = true;

				console.error(error);
			},
		});

		setTimeout(abort, ABORT_DELAY);
	});
}

function handleBrowserRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	remixContext: EntryContext
) {
	return new Promise(async (resolve, reject) => {
		const queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					suspense: true,
					refetchOnWindowFocus: false,
					refetchOnMount: false,
					staleTime: 1000 * 60 * 1,
					cacheTime: 1000 * 60 * 5,
				},
			},
		});

		let dehydratedState = dehydrate(queryClient);
		let didError = false;

		const App = (
			<QueryClientProvider client={queryClient}>
				<Hydrate state={dehydratedState}>
					<RemixServer context={remixContext} url={request.url} />
				</Hydrate>
			</QueryClientProvider>
		);

		const { pipe, abort } = renderToPipeableStream(App, {
			onShellReady() {
				const body = new PassThrough();

				var state = new Transform({
					transform(chunk, encoding, callback) {
						callback(null, chunk);
					},
					flush(callback) {
						dehydratedState = dehydrate(queryClient);
						this.push(
							`<script>
								window.__REACT_QUERY_STATE__=${JSON.stringify(dehydratedState).replace(/</g, '\\u003c')}
							</script>`
						);
						callback();
					},
				});

				responseHeaders.set('Content-Type', 'text/html');

				resolve(
					new Response(body, {
						headers: responseHeaders,
						status: didError ? 500 : responseStatusCode,
					})
				);

				pipe(state).pipe(body);
			},
			onShellError(err: unknown) {
				reject(err);
			},
			onError(error: unknown) {
				didError = true;

				console.error(error);
			},
		});

		setTimeout(abort, ABORT_DELAY);
	});
}
