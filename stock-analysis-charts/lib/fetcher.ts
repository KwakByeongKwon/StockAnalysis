export const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("request failed")
    return r.json()
  })
