export const parseVueRequest = (id: string) => {
  // 解析url
  const query = parseQuery(id.slice(id.indexOf('?')))

  const path = id.slice(0, id.indexOf('?') === -1 ? id.length : id.indexOf('?'))
  let parts = path.split('/')
  let filename = parts.pop()
  return {
    filename,
    path,
    query
  }
}
export const parseQuery = (query: string) => {
  return query
    .replace(/^[?#]/, '')
    .split('&')
    .reduce((ret: any, cur) => {
      const [key, val] = cur.split('=')
      ret[key] = val || true
      return ret
    }, {})
}
