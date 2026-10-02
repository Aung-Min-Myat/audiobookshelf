interface FileMetadataData {
  filename: string | null
  ext: string | null
  path: string | null
  relPath: string | null
  size: number | null
  mtimeMs: number | null
  ctimeMs: number | null
  birthtimeMs: number | null
}

class FileMetadata {
  [key: string]: unknown // update() and setData() copy payload values onto this by a dynamic key
  declare filename: string | null
  declare ext: string | null
  declare path: string | null
  declare relPath: string | null
  declare size: number | null
  declare mtimeMs: number | null
  declare ctimeMs: number | null
  declare birthtimeMs: number | null
  declare wasModified: boolean

  constructor(metadata?: FileMetadataData) {
    this.filename = null
    this.ext = null
    this.path = null
    this.relPath = null
    this.size = null
    this.mtimeMs = null
    this.ctimeMs = null
    this.birthtimeMs = null

    if (metadata) {
      this.construct(metadata)
    }

    // Temp flag used in scans
    this.wasModified = false
  }

  construct(metadata: FileMetadataData): void {
    this.filename = metadata.filename
    this.ext = metadata.ext
    this.path = metadata.path
    this.relPath = metadata.relPath
    this.size = metadata.size
    this.mtimeMs = metadata.mtimeMs
    this.ctimeMs = metadata.ctimeMs
    this.birthtimeMs = metadata.birthtimeMs
  }

  toJSON(): FileMetadataData {
    return {
      filename: this.filename,
      ext: this.ext,
      path: this.path,
      relPath: this.relPath,
      size: this.size,
      mtimeMs: this.mtimeMs,
      ctimeMs: this.ctimeMs,
      birthtimeMs: this.birthtimeMs
    }
  }

  clone(): FileMetadata {
    return new FileMetadata(this.toJSON())
  }

  get format(): string {
    if (!this.ext) return ''
    return this.ext.slice(1).toLowerCase()
  }
  get filenameNoExt(): string {
    return this.filename!.replace(this.ext!, '') // filename and ext are set by construct() or setData() before this is read
  }

  update(payload: Record<string, unknown>): boolean {
    var hasUpdates = false
    for (const key in payload) {
      if (this[key] !== undefined && this[key] !== payload[key]) {
        this[key] = payload[key]
        hasUpdates = true
      }
    }
    return hasUpdates
  }

  setData(payload: Record<string, unknown>): void {
    for (const key in payload) {
      if (this[key] !== undefined) {
        this[key] = payload[key]
      }
    }
  }
}
export = FileMetadata
