const nodeCache = require('node-cache')
const pac = require('pac-resolver')
const getUri = require('get-uri')
const getRawBody = require('raw-body')
const debug = require('debug')

const PAC_URL = 'https://antizapret.prostovpn.org/proxy.pac'
const PAC_TTL = 60 * 60
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36 Edg/83.0.478.45';

const cache = new nodeCache()

const loadPacFile = async () => {
  debug('loadPacFile')('Starting to load pac file')
  const options = {
    headers: { 'User-Agent': USER_AGENT }
  }
  const rs = await getUri(PAC_URL, options)
  const buf = await getRawBody(rs)
  return buf.toString('utf-8')
}

const getResolver = async () => {
  let resolver = cache.get('pac-resolver')
  if (resolver === undefined) {
    const code = await loadPacFile()
    resolver = pac(code)
    cache.set('pac-resolver', resolver, PAC_TTL)
  }
  return resolver
}
module.exports.getCache = () => {
  return cache
}
module.exports.getProxyAddress = async (url) => {
  debug('getProxyAddress')('Now finding address for url: ' + url)
  const resolver = await getResolver()
  const proxy = await resolver(url)
  const chunks = proxy.split(';')
  const proxies = []
  chunks.forEach(chunk => {
    const element = chunk.trim()
    if (element !== 'DIRECT') {
      const [type, address] = element.split(' ').map(chunk => chunk.trim().toLowerCase())
      if (type === 'proxy' || type === 'http') {
        const protocol = 'http'
        proxies.push(protocol + '://' + address)
      }
    } else {
      proxies.push(null)
    }
  })
  return proxies.length > 0 ? proxies[0] : null
}
module.exports.fixUrl = (url) => {
  if (url.indexOf('://') > -1) {
    var [protocol, address] = url.split('://');
  } else {
    var address = url;
  }
  [address] = address.split(':')
  if (!protocol) {
    protocol = 'http';
  }
  return protocol + '://' + address;

}
module.exports.getResolver = getResolver

