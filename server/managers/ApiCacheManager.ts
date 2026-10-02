import lruCache = require('lru-cache')
import Logger = require('../Logger')
import Database = require('../Database')
import type { Request, Response, NextFunction } from 'express'
import type { OutgoingHttpHeaders } from 'http'
const { LRUCache } = lruCache
type User = import('../models/User')

interface CachedResponse {
  body: string | Buffer
  headers: OutgoingHttpHeaders
  statusCode: number
}

type CacheClearingHook = 'afterCreate' | 'afterUpdate' | 'afterDestroy' | 'afterBulkCreate' | 'afterBulkUpdate' | 'afterBulkDestroy' | 'afterUpsert'

// First argument of a Sequelize hook: a model instance, an options object with .model, or a model class
interface HookTarget {
  name?: unknown
  model?: { name?: unknown } | null
}

type RequestWithUser = Request & { user: User }

// The middleware replaces send with a wrapper that returns nothing and keeps express's send as originalSend
type CachingResponse = Omit<Response, 'send'> & {
  send: (body: string | Buffer) => void
  originalSend: (body: string | Buffer) => void
}

class ApiCacheManager {
  declare cache: lruCache.LRUCache<string, CachedResponse>
  declare ttlOptions: { ttl: number }

  defaultCacheOptions: lruCache.LRUCache.Options<string, CachedResponse, unknown> = { max: 1000, maxSize: 10 * 1000 * 1000, sizeCalculation: (item) => item.body.length + JSON.stringify(item.headers).length }
  defaultTtlOptions = { ttl: 30 * 60 * 1000 }
  highChurnModels = new Set(['session', 'mediaProgress', 'playbackSession', 'device'])
  modelsInvalidatingPersonalized = new Set(['mediaProgress'])
  modelsInvalidatingMe = new Set(['session', 'mediaProgress', 'playbackSession', 'device'])

  constructor(cache: lruCache.LRUCache<string, CachedResponse> = new LRUCache(this.defaultCacheOptions), ttlOptions: { ttl: number } = this.defaultTtlOptions) {
    this.cache = cache
    this.ttlOptions = ttlOptions
  }

  init(database = Database): void {
    let hooks: CacheClearingHook[] = ['afterCreate', 'afterUpdate', 'afterDestroy', 'afterBulkCreate', 'afterBulkUpdate', 'afterBulkDestroy', 'afterUpsert']
    hooks.forEach((hook) => database.sequelize!.addHook(hook, (model: object) => this.clear(model, hook))) // sequelize starts as null; Database.init() sets it before Server calls init()
  }

  getModelName(model: HookTarget | null | undefined): string {
    if (typeof model?.name === 'string') return model.name
    if (typeof model?.model?.name === 'string') return model.model.name
    if (typeof model?.constructor?.name === 'string' && model.constructor.name !== 'Object') return model.constructor.name
    return 'unknown'
  }

  clearByUrlPattern(urlPattern: RegExp): number {
    let removed = 0
    for (const key of this.cache.keys()) {
      try {
        const parsed = JSON.parse(key)
        if (typeof parsed?.url === 'string' && urlPattern.test(parsed.url)) {
          if (this.cache.delete(key)) removed++
        }
      } catch {
        if (this.cache.delete(key)) removed++
      }
    }
    return removed
  }

  clearUserProgressSlices(modelName: string, hook: string): void {
    let removedPersonalized = 0
    let removedRecentEpisodes = 0
    if (this.modelsInvalidatingPersonalized.has(modelName)) {
      removedPersonalized = this.clearByUrlPattern(/^\/libraries\/[^/]+\/personalized/)
      removedRecentEpisodes = this.clearByUrlPattern(/^\/libraries\/[^/]+\/recent-episodes/)
    }
    const removedMe = this.modelsInvalidatingMe.has(modelName) ? this.clearByUrlPattern(/^\/me(\/|\?|$)/) : 0
    Logger.debug(`[ApiCacheManager] ${modelName}.${hook}: cleared user-progress cache slices (personalized=${removedPersonalized}, recentEpisodes=${removedRecentEpisodes}, me=${removedMe})`)
  }

  clear(model: HookTarget | null | undefined, hook: string): void {
    const modelName = this.getModelName(model)
    if (this.highChurnModels.has(modelName)) {
      this.clearUserProgressSlices(modelName, hook)
      return
    }

    Logger.debug(`[ApiCacheManager] ${modelName}.${hook}: Clearing cache`)
    this.cache.clear()
  }

  /**
   * Reset hooks and clear cache. Used when applying backups
   */
  reset(): void {
    Logger.info(`[ApiCacheManager] Resetting cache`)

    this.init()
    this.cache.clear()
  }

  get middleware() {
    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {import('express').NextFunction} next
     */
    return (req: RequestWithUser, res: CachingResponse, next: NextFunction): void => {
      if (req.query.sort === 'random') {
        Logger.debug(`[ApiCacheManager] Skipping cache for random sort`)
        return next()
      }

      const key = { user: req.user.username, url: req.url }
      const stringifiedKey = JSON.stringify(key)
      Logger.debug(`[ApiCacheManager] count: ${this.cache.size} size: ${this.cache.calculatedSize}`)
      const cached = this.cache.get(stringifiedKey)
      if (cached) {
        Logger.debug(`[ApiCacheManager] Cache hit: ${stringifiedKey}`)
        res.set(cached.headers)
        res.status(cached.statusCode)
        res.send(cached.body)
        return
      }
      res.originalSend = res.send
      res.send = (body) => {
        Logger.debug(`[ApiCacheManager] Cache miss: ${stringifiedKey}`)
        const cached: CachedResponse = { body, headers: res.getHeaders(), statusCode: res.statusCode }
        if (key.url.search(/^\/libraries\/.*?\/personalized/) !== -1) {
          Logger.debug(`[ApiCacheManager] Caching with ${this.ttlOptions.ttl} ms TTL`)
          this.cache.set(stringifiedKey, cached, this.ttlOptions)
        } else {
          this.cache.set(stringifiedKey, cached)
        }
        res.originalSend(body)
      }
      next()
    }
  }
}
export = ApiCacheManager
