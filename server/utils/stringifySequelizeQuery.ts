/** A value JSON.stringify hands to the replacer; Sequelize find options can hold model classes and symbol-keyed operators (Op.*) */
type ReplacerValue = { [key: PropertyKey]: unknown } | string | number | boolean | bigint | symbol | null | undefined | Function

function stringifySequelizeQuery(findOptions: unknown): string {
  function isClass(func: unknown): func is Function {
    return typeof func === 'function' && /^class\s/.test(func.toString())
  }

  function replacer(key: string, value: ReplacerValue): unknown {
    if (typeof value === 'object' && value !== null) {
      const symbols = Object.getOwnPropertySymbols(value).reduce<Record<string, unknown>>((acc, sym) => {
        acc[sym.toString()] = value[sym]
        return acc
      }, {})

      return { ...value, ...symbols }
    }

    if (isClass(value)) {
      return `${value.name}`
    }

    return value
  }

  return JSON.stringify(findOptions, replacer)
}
export = stringifySequelizeQuery
