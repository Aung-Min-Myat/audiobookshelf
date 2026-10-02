import type { Request, Response } from 'express'
import CacheManager = require('../managers/CacheManager')
type User = import('../models/User')

type RequestWithUser = Request & { user: User }

/**
 * @typedef RequestUserObject
 * @property {import('../models/User')} user
 *
 * @typedef {Request & RequestUserObject} RequestWithUser
 */

class CacheController {
  constructor() {}

  /**
   * POST: /api/cache/purge
   *
   * @param {RequestWithUser} req
   * @param {Response} res
   */
  async purgeCache(req: RequestWithUser, res: Response) {
    if (!req.user.isAdminOrUp) {
      return res.sendStatus(403)
    }
    await CacheManager.purgeAll()
    res.sendStatus(200)
  }

  /**
   * POST: /api/cache/items/purge
   *
   * @param {RequestWithUser} req
   * @param {Response} res
   */
  async purgeItemsCache(req: RequestWithUser, res: Response) {
    if (!req.user.isAdminOrUp) {
      return res.sendStatus(403)
    }
    await CacheManager.purgeItems()
    res.sendStatus(200)
  }
}
export = new CacheController()
