
const ProxyChain = require('proxy-chain');
const debug = require('debug')('antizapret')
const { getCache, fixUrl, getProxyAddress } = require('./util')

const server = new ProxyChain.Server({
    port: 8000,
    verbose: false,
    prepareRequestFunction: async ({ request, port, isHttp }) => {
        const cache = getCache()
        let proxyConnection = cache.get(request.url)
        if (proxyConnection === undefined) {
            const address = fixUrl(request.url)
            const proxyUrl = await getProxyAddress(address)
            debug('Using address ' + proxyUrl + ' for url ' + request.url)
            proxyConnection = {
                requestAuthentication: false,
                upstreamProxyUrl: proxyUrl,
                failMsg: 'Bad username or password, please try again.',
            }
            cache.set(request.url, proxyConnection, 60 * 60 * 24)
        }
        return proxyConnection
    },
});

server.listen(() => {
    debug(`Proxy server is listening on port ${server.port}`);
});

// Emitted when HTTP connection is closed
server.on('connectionClosed', ({ connectionId, stats }) => {
    console.log(`Connection ${connectionId} closed`);
    console.dir(stats);
});

// Emitted when HTTP request fails
server.on('requestFailed', ({ request, error }) => {
    console.log(`Request ${request.url} failed`);
    console.error(error);
});