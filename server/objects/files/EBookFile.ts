import FileMetadata = require('../metadata/FileMetadata')
type LibraryFile = import('./LibraryFile')
type LoadedLibraryFile = LibraryFile & { metadata: FileMetadata } // its metadata starts as null; callers pass files whose metadata is set

interface EBookFileData {
  ino: string
  metadata: ConstructorParameters<typeof FileMetadata>[0]
  ebookFormat?: string // a LibraryFile has none, so construct() falls back to metadata.format
  addedAt: number
  updatedAt: number
}

class EBookFile {
  declare ino: string | null
  declare metadata: FileMetadata | null
  declare ebookFormat: string | null
  declare addedAt: number | null
  declare updatedAt: number | null

  constructor(file?: EBookFileData) {
    this.ino = null
    this.metadata = null
    this.ebookFormat = null
    this.addedAt = null
    this.updatedAt = null

    if (file) {
      this.construct(file)
    }
  }

  construct(file: EBookFileData): void {
    this.ino = file.ino
    this.metadata = new FileMetadata(file.metadata)
    this.ebookFormat = file.ebookFormat || this.metadata.format
    this.addedAt = file.addedAt
    this.updatedAt = file.updatedAt
  }

  toJSON() {
    return {
      ino: this.ino,
      metadata: this.metadata!.toJSON(), // metadata is set by construct() or setData() before toJSON() is called
      ebookFormat: this.ebookFormat,
      addedAt: this.addedAt,
      updatedAt: this.updatedAt
    }
  }

  get isEpub() {
    return this.ebookFormat === 'epub'
  }

  setData(libraryFile: LoadedLibraryFile): void {
    this.ino = libraryFile.ino
    this.metadata = libraryFile.metadata.clone()
    this.ebookFormat = libraryFile.metadata.format
    this.addedAt = Date.now()
    this.updatedAt = Date.now()
  }

  updateFromLibraryFile(libraryFile: LoadedLibraryFile): boolean {
    var hasUpdated = false

    if (this.metadata!.update(libraryFile.metadata)) { // metadata is set by construct() or setData() before an update
      hasUpdated = true
    }

    if (this.ebookFormat !== libraryFile.metadata.format) {
      this.ebookFormat = libraryFile.metadata.format
      hasUpdated = true
    }

    return hasUpdated
  }
}
export = EBookFile
