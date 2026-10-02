import sanitizeHtml = require('../libs/sanitizeHtml')
import htmlEntities = require('./htmlEntities')
// Index signature: decodeHTMLEntities() reads the entity table by a dynamic key (the matched entity text)
const { entities }: { entities: { [entity: string]: string } } = htmlEntities

/**
 *
 * @param {string} html
 * @returns {string}
 */
function sanitize(html: string | null | undefined): string {
  if (typeof html !== 'string') {
    return ''
  }

  const sanitizerOptions = {
    allowedTags: ['p', 'ol', 'ul', 'li', 'a', 'strong', 'em', 'del', 'br', 'b', 'i'],
    disallowedTagsMode: 'discard',
    allowedAttributes: {
      a: ['href', 'name', 'target']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false
  }

  return sanitizeHtml(html, sanitizerOptions)
}

function stripAllTags(html: string | null | undefined, shouldDecodeEntities = true): string {
  if (typeof html !== 'string') return ''

  const sanitizerOptions = {
    allowedTags: [],
    disallowedTagsMode: 'discard'
  }

  let sanitized = sanitizeHtml(html, sanitizerOptions)
  return shouldDecodeEntities ? decodeHTMLEntities(sanitized) : sanitized
}

function decodeHTMLEntities(strToDecode: string): string {
  return strToDecode.replace(/\&([^;]+);?/g, function (entity) {
    if (entity in entities) {
      return entities[entity]
    }
    return entity
  })
}

export = { sanitize, stripAllTags }
