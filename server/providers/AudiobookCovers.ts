import axiosModule = require('axios')
const axios = axiosModule.default
import Logger = require('../Logger')

/** One result of api.audiobookcovers.com/cover/bytext/ (only the fields read here) */
interface AudiobookCoversItem {
  versions: { png: { original: string } }
}

class AudiobookCovers {
  #responseTimeout = 10000

  constructor() {}

  /**
   *
   * @param {string} search
   * @param {number} [timeout]
   * @returns {Promise<{cover: string}[]>}
   */
  async search(search: string, timeout: number = this.#responseTimeout): Promise<{ cover: string }[]> {
    if (!timeout || isNaN(timeout)) timeout = this.#responseTimeout

    const url = `https://api.audiobookcovers.com/cover/bytext/`
    const params = new URLSearchParams([['q', search]])
    const items = await axios
      .get<AudiobookCoversItem[]>(url, {
        params,
        timeout
      })
      .then((res) => res?.data || [])
      .catch((error: Error) => {
        Logger.error('[AudiobookCovers] Cover search error', error.message)
        return []
      })
    return items.map((item) => ({ cover: item.versions.png.original }))
  }
}
export = AudiobookCovers
