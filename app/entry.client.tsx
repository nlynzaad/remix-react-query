import { RemixBrowser } from '@remix-run/react';
import { QueryClientProvider, Hydrate, QueryClient, dehydrate } from '@tanstack/react-query';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

function hydrate() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				suspense: false,
				refetchOnWindowFocus: false,
				refetchOnMount: false,
				staleTime: 1000 * 60 * 1,
				cacheTime: 1000 * 60 * 5,
			},
		},
	});

	const dehydratedState = window.__REACT_QUERY_STATE__;
	delete window.__REACT_QUERY_STATE__;

	startTransition(() => {
		hydrateRoot(
			document,
			<StrictMode>
				<QueryClientProvider client={queryClient}>
					<Hydrate state={dehydratedState}>
						<RemixBrowser />
					</Hydrate>
				</QueryClientProvider>
			</StrictMode>
		);
	});
}

if (window.requestIdleCallback) {
	window.requestIdleCallback(hydrate);
} else {
	window.setTimeout(hydrate, 1);
}
