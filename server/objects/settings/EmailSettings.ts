import Logger = require('../../Logger')
import utils = require('../../utils')
const { areEquivalent, copyValue, isNullOrNaN }: {
  areEquivalent: (value1: unknown, value2: unknown) => boolean
  copyValue: (val: unknown) => unknown
  isNullOrNaN: (num: unknown) => boolean
} = utils

type User = import('../../models/User')

interface EreaderDeviceObject {
  name: string
  email: string
  availabilityOption: string
  users: string[]
}

/** An ereader device as sent in an update payload, before validation */
type EreaderDeviceInput = Partial<EreaderDeviceObject>

/** Settings JSON as stored in the database by toJSON(); absent keys fall back to defaults */
interface EmailSettingsData {
  id?: string
  host: string | null
  port: number
  secure?: boolean
  rejectUnauthorized?: boolean // added after v2.10.1
  user: string | null
  pass: string | null
  testAddress: string | null
  fromAddress: string | null
  ereaderDevices?: EreaderDeviceObject[]
}

interface EmailSettingsUpdatePayload {
  [key: string]: unknown // update() reads the payload by a dynamic key
  port?: number | string | null
  secure?: boolean
  rejectUnauthorized?: boolean
  // read before and after validation; the validated array never holds null (filtered out), but filter() is typed as keeping it
  get ereaderDevices(): EreaderDeviceInput[] | undefined
  set ereaderDevices(value: (EreaderDeviceInput | null)[] | undefined)
}

interface EmailTransportObject {
  host: string | null
  secure: boolean
  port?: number
  auth?: { user: string; pass: string | null }
  tls?: { rejectUnauthorized: boolean }
}

/**
 * @typedef EreaderDeviceObject
 * @property {string} name
 * @property {string} email
 * @property {string} availabilityOption
 * @property {string[]} users
 */

// REF: https://nodemailer.com/smtp/
class EmailSettings {
  [key: string]: unknown // update() assigns payload values onto this by a dynamic key
  declare id: string
  declare host: string | null
  declare port: number
  declare secure: boolean
  declare rejectUnauthorized: boolean
  declare user: string | null
  declare pass: string | null
  declare testAddress: string | null
  declare fromAddress: string | null
  declare ereaderDevices: EreaderDeviceObject[]

  constructor(settings: EmailSettingsData | null = null) {
    this.id = 'email-settings'
    this.host = null
    this.port = 465
    this.secure = true
    this.rejectUnauthorized = true
    this.user = null
    this.pass = null
    this.testAddress = null
    this.fromAddress = null

    /** @type {EreaderDeviceObject[]} */
    this.ereaderDevices = []

    if (settings) {
      this.construct(settings)
    }
  }

  construct(settings: EmailSettingsData): void {
    this.host = settings.host
    this.port = settings.port
    this.secure = !!settings.secure
    this.rejectUnauthorized = !!settings.rejectUnauthorized
    this.user = settings.user
    this.pass = settings.pass
    this.testAddress = settings.testAddress
    this.fromAddress = settings.fromAddress
    this.ereaderDevices = settings.ereaderDevices?.map((d) => ({ ...d })) || []

    // rejectUnauthorized added after v2.10.1 - defaults to true
    if (settings.rejectUnauthorized === undefined) {
      this.rejectUnauthorized = true
    }
  }

  toJSON() {
    return {
      id: this.id,
      host: this.host,
      port: this.port,
      secure: this.secure,
      rejectUnauthorized: this.rejectUnauthorized,
      user: this.user,
      pass: this.pass,
      testAddress: this.testAddress,
      fromAddress: this.fromAddress,
      ereaderDevices: this.ereaderDevices.map((d) => ({ ...d }))
    }
  }

  update(payload: EmailSettingsUpdatePayload | null | undefined): boolean {
    if (!payload) return false

    if (payload.port !== undefined) {
      if (isNullOrNaN(payload.port)) payload.port = 465
      else payload.port = Number(payload.port)
    }
    if (payload.secure !== undefined) payload.secure = !!payload.secure
    if (payload.rejectUnauthorized !== undefined) payload.rejectUnauthorized = !!payload.rejectUnauthorized

    if (payload.ereaderDevices !== undefined && !Array.isArray(payload.ereaderDevices)) payload.ereaderDevices = undefined

    if (payload.ereaderDevices?.length) {
      // Validate ereader devices
      payload.ereaderDevices = payload.ereaderDevices
        .map((device) => {
          if (!device.name || !device.email) {
            Logger.error(`[EmailSettings] Update ereader device is invalid`, device)
            return null
          }
          if (!device.availabilityOption || !['adminOrUp', 'userOrUp', 'guestOrUp', 'specificUsers'].includes(device.availabilityOption)) {
            device.availabilityOption = 'adminOrUp'
          }
          if (device.availabilityOption === 'specificUsers' && !device.users?.length) {
            device.availabilityOption = 'adminOrUp'
          }
          if (device.availabilityOption !== 'specificUsers' && device.users?.length) {
            device.users = []
          }
          return device
        })
        .filter((d) => d)
    }

    let hasUpdates = false

    const json: Record<string, unknown> = this.toJSON()
    for (const key in json) {
      if (key === 'id') continue

      if (payload[key] !== undefined && !areEquivalent(payload[key], json[key])) {
        this[key] = copyValue(payload[key])
        hasUpdates = true
      }
    }

    return hasUpdates
  }

  getTransportObject(): EmailTransportObject {
    const payload: EmailTransportObject = {
      host: this.host,
      secure: this.secure
    }
    // Only set to true for port 465 (https://nodemailer.com/smtp/#tls-options)
    if (this.port !== 465) {
      payload.secure = false
    }
    if (this.port) payload.port = this.port
    if (this.user && this.pass !== undefined) {
      payload.auth = {
        user: this.user,
        pass: this.pass
      }
    }
    // Allow self-signed certs (https://nodemailer.com/smtp/#3-allow-self-signed-certificates)
    if (!this.rejectUnauthorized) {
      payload.tls = {
        rejectUnauthorized: false
      }
    }

    return payload
  }

  /**
   *
   * @param {EreaderDeviceObject} device
   * @param {import('../../models/User')} user
   * @returns {boolean}
   */
  checkUserCanAccessDevice(device: EreaderDeviceObject, user: User): boolean {
    let deviceAvailability = device.availabilityOption || 'adminOrUp'
    if (deviceAvailability === 'adminOrUp' && user.isAdminOrUp) return true
    if (deviceAvailability === 'userOrUp' && (user.isAdminOrUp || user.isUser)) return true
    if (deviceAvailability === 'guestOrUp') return true
    if (deviceAvailability === 'specificUsers') {
      let deviceUsers = device.users || []
      return deviceUsers.includes(user.id)
    }
    return false
  }

  /**
   * Get ereader devices accessible to user
   *
   * @param {import('../../models/User')} user
   * @returns {EreaderDeviceObject[]}
   */
  getEReaderDevices(user: User): EreaderDeviceObject[] {
    return this.ereaderDevices.filter((device) => this.checkUserCanAccessDevice(device, user))
  }

  /**
   * Get ereader device by name
   *
   * @param {string} deviceName
   * @returns {EreaderDeviceObject}
   */
  getEReaderDevice(deviceName: string): EreaderDeviceObject | undefined {
    return this.ereaderDevices.find((d) => d.name === deviceName)
  }
}
export = EmailSettings
