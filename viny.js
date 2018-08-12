const VALIDATION_MISSING = 'validation_missing'
const PROPERTY_MISSING = 'property_missing'
const INVALID = 'invalid'
const NOT_AN_ARRAY = 'not_an_array'

const VINY_PARTIAL = Symbol()

module.exports = viny
module.exports.errors = errors
module.exports.ok = ok
module.exports.and = and
module.exports.or = or
module.exports.not = not
module.exports.every = every
module.exports.some = some

function viny (validation, localOptions) {

    return partial(function (arg, contextualOptions) {
        return validate(validation, localOptions, arg, contextualOptions)
    })
}

function errors (validation, arg, contextualOptions) {
    return validate(validation, {}, arg, contextualOptions)
}

function ok (validation, arg) {
    return validate(validation, {}, arg) === null
}

function and (...validations) {
    return partial(function (arg, contextualOptions) {
        for (let validation of validations) {
            const errors = validate(validation, {}, arg, contextualOptions)
            if (errors) {
                return errors
            }
        }
        return null
    })
}

function or (...validations) {
    return partial(function (arg, contextualOptions) {
        let errors = []
        for (let validation of validations) {
            const err = validate(validation, {}, arg, contextualOptions)
            if (err) {
                errors.push(err)
            }
        }
        return errors.length === validations.length
            ? Array.prototype.concat.apply([], errors)
            : null
    })
}

function not (validation) {
    return partial(function (arg, contextualOptions) {

        const result = probe(validation, arg, contextualOptions)

        if (result.probeInvalidities.length) {
            return null
        } else {
            addInvalidity(result.originalInvalidities, INVALID, result.depth, arg, result.values)
            return result.originalInvalidities
        }
    })
}

function every (validation) {
    return partial(function (argsArray, contextualOptions) {
        if (!Array.isArray(argsArray)) { return [ invalid(NOT_AN_ARRAY, 0) ] }

        contextualOptions = contextualOptions || {}

        const initialDepth = contextualOptions.depth || 0
        const invalidities = contextualOptions.invalidities || []

        contextualOptions = Object.assign({}, contextualOptions, {
            depth: initialDepth + 1,
            invalidities,
        })

        for (let i = 0; i < argsArray.length; i++) {
            const initialInvaliditiesLength = invalidities.length
            const arg = argsArray[i]
            const errors = validate(validation, {}, arg, contextualOptions)
            if (errors) {
                setKey(invalidities, initialInvaliditiesLength, String(i), initialDepth)
                if (!contextualOptions.greedy) { return invalidities }
            }
        }
        return invalidities.length ? invalidities : null
    })
}

function some (validation) {
    return partial(function (argsArray, contextualOptions) {
        if (!Array.isArray(argsArray)) { return [ invalid(NOT_AN_ARRAY, 0) ] }

        contextualOptions = contextualOptions || {}

        const innerInvalidities = []
        const initialDepth = contextualOptions.depth || 0
        const invalidities = contextualOptions.invalidities || []

        contextualOptions = Object.assign({}, contextualOptions, {
            depth: initialDepth + 1,
            invalidities: innerInvalidities,
        })

        let nErrors = 0

        for (let i = 0; i < argsArray.length; i++) {
            const initialInvaliditiesLength = innerInvalidities.length
            const arg = argsArray[i]
            const errors = validate(validation, {}, arg, contextualOptions)
            if (errors) {
                nErrors++
                setKey(innerInvalidities, initialInvaliditiesLength, String(i), initialDepth)
            }
        }

        if (nErrors < argsArray.length) {
            return null
        } else {
            Array.prototype.push.apply(invalidities, innerInvalidities)
            return invalidities
        }
    })
}

function probe (validation, arg, contextualOptions) {

    const probeInvalidities = []
    contextualOptions = contextualOptions || {}
    const originalInvalidities = contextualOptions.invalidities || []
    const greedy = contextualOptions.greedy || false
    const values = contextualOptions.values || false
    const depth = contextualOptions.depth || 0

    contextualOptions = Object.assign({}, contextualOptions, {
        invalidities: probeInvalidities,
    })

    validate(validation, {}, arg, contextualOptions)

    return {
        probeInvalidities,
        originalInvalidities,
        greedy,
        values,
        depth,
    }
}

function validate (
    validation,
    {
        label = INVALID,
        loose = false,
        optional = null,
    } = {},
    arg,
    {
        greedy = false,
        values = false,
        invalidities = [],
        depth = 0,
    } = {}
) {

    if (validation === arg) { return null }

    if (typeof validation === 'function') {
        if (validation[VINY_PARTIAL]) {
            const errors = validation(arg, { greedy, values, invalidities, depth })
            if (errors === null) {
                return null
            } else {
                if (greedy && label !== INVALID) {
                    addInvalidity(invalidities, label, depth, arg, values)
                }
                return invalidities
            }
        } else {
            const ok = validation(arg)
            if (ok === true) {
                return null
            } else {
                addInvalidity(invalidities, label, depth, arg, values)
                return invalidities
            }
        }
    }

    if (optional) {
        let o = {}
        for (let field of optional) {
            o[field] = true
        }
        optional = o
    }

    if (isObject(validation) && isObject(arg)) {

        let argKeysNumber = 0

        const nextDepth = depth + 1

        for (let key in arg) {

            const lastInvaliditiesLength = invalidities.length
            argKeysNumber++

            if (!validation.hasOwnProperty(key)) {
                if (loose) { continue }
                addInvalidity(invalidities, VALIDATION_MISSING, nextDepth, arg[key], values)
            } else {
                validate(validation[key], {}, arg[key], {
                    greedy, values, invalidities, depth: nextDepth,
                })
            }

            if (lastInvaliditiesLength < invalidities.length) {
                setKey(invalidities, lastInvaliditiesLength, key, depth)
                if (!greedy) { return invalidities }
            }
        }

        for (let key in validation) {
            if (validation.hasOwnProperty(key) && !hasEnumerableProp(arg, key) && (!optional || !optional[key])) {
                addInvalidity(invalidities, PROPERTY_MISSING, nextDepth, null, false)
                setKey(invalidities, invalidities.length - 1, key, depth)
                if (!greedy) { return invalidities }
            }
        }

        if (greedy && invalidities.length && label !== INVALID) {
            addInvalidity(invalidities, label, depth, arg, values)
        }

        return invalidities.length ? invalidities : null
    }

    addInvalidity(invalidities, label, depth, arg, values)

    return invalidities
}

function addInvalidity (invalidities, label, depth, value, includeValues) {
    const invalidity = invalid(label, depth, value, includeValues)
    invalidities.push(invalid(label, depth, value, includeValues))
}

function invalid (error, size = 0, value, includeValues) {
    const path = new Array(size)
    return includeValues ? { path: path, error, value } : { path: path, error }
}

function isObject (obj) {
    return obj && typeof obj === 'object'
}

function setKey (invalidities, from, key, index) {
    let to = invalidities.length
    while (to-- > from) {
        invalidities[to].path[index] = key
    }
}

function hasEnumerableProp (obj, prop) {
    if (obj.propertyIsEnumerable(prop)) { return true }
    while ((obj = Object.getPrototypeOf(obj)) !== Object.prototype) {
        if (obj.propertyIsEnumerable(prop)) {
            return true
        }
    }
    return false
}

function partial (fn) {
    Object.defineProperty(fn, VINY_PARTIAL, { value: true })
    return fn
}
