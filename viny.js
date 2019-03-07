const PROPERTY_UNEXPECTED = 'property_unexpected'
const PROPERTY_MISSING = 'property_missing'
const INVALID = 'invalid'
const NON_ITER = 'non_iterable'

module.exports = viny
module.exports.errors = errors
module.exports.ok = ok
module.exports.and = and
module.exports.or = or
module.exports.not = not
module.exports.every = every
module.exports.some = some

function viny (validation, localOptions) {
    return function (arg, contextualOptions) {
        return validate(validation, localOptions, arg, contextualOptions)
    }
}

function errors (validation, arg, contextualOptions) {
    return validate(validation, {}, arg, contextualOptions)
}

function ok (validation, arg) {
    return validate(validation, {}, arg) === null
}

function and (...validations) {
    return function (arg, contextualOptions) {
        for (let validation of validations) {
            const errors = validate(validation, {}, arg, contextualOptions)
            if (errors) {
                return errors
            }
        }
        return null
    }
}

function or (...validations) {
    return function (arg, { invalidities = [], greedy, values, depth } = {}) {

        const contextualOptions = { invalidities: [], greedy, values, depth }

        let nErrors = 0
        for (let validation of validations) {
            const errors = validate(validation, {}, arg, contextualOptions)
            if (errors) {
                nErrors++
            }
        }

        return nErrors < validations.length
            ? null
            : applyPush(invalidities, contextualOptions.invalidities)
    }
}

function not (validation) {
    return function (arg, { invalidities = [], greedy, values, depth } = {}) {

        const errors = validate(validation, {}, arg, { greedy, values, depth })

        return errors
            ? null
            : addInvalidity(invalidities, INVALID, depth, arg, values)
    }
}

function every (validation) {
    return function (args, { invalidities = [], greedy, values, depth } = {}) {

        if (!Array.isArray(args) && !isObject(args)) {
            return addInvalidity(invalidities, NON_ITER, depth, args, values)
        }

        const contextualOptions = { invalidities: [], greedy, values, depth }

        for (let k in args) {
            const errors = validate(
                { [k]: validation }, {}, { [k]: args[k] }, contextualOptions)
            if (errors && !greedy) {
                break
            }
        }

        return contextualOptions.invalidities.length
            ? applyPush(invalidities, contextualOptions.invalidities)
            : null
    }
}

function some (validation) {
    return function (args, { invalidities = [], greedy, values, depth } = {}) {

        if (!Array.isArray(args) && !isObject(args)) {
            return addInvalidity(invalidities, NON_ITER, depth, args, values)
        }

        const contextualOptions = { invalidities: [], greedy, values, depth }

        let nErrors = 0
        for (let k in args) {
            const errors = validate(
                { [k]: validation }, {}, { [k]: args[k] }, contextualOptions)
            if (errors) {
                nErrors++
            }
        }

        return nErrors < Object.keys(args).length
            ? null
            : applyPush(invalidities, contextualOptions.invalidities)
    }
}

function validate (
    validation,
    { label = INVALID, loose = false, optional = null } = {},
    arg,
    { greedy = false, values = false, invalidities = [], depth = 0 } = {},
) {

    if (validation === arg) { return null }

    if (typeof validation === 'function') {
        const result = validation(arg, { greedy, values, invalidities, depth })
        if (result === null || result === true) {
            return null
        } else if (Array.isArray(result)) {
            if (greedy && label !== INVALID) {
                addInvalidity(invalidities, label, depth, arg, values)
            }
            return invalidities
        } else {
            return addInvalidity(invalidities, label, depth, arg, values)
        }
    }

    if (isObject(validation) && isObject(arg)) {

        const nextDepth = depth + 1

        const initialInvaliditiesLength = invalidities.length

        for (let key in arg) {

            const prevInvaliditiesLength = invalidities.length

            if (!validation.hasOwnProperty(key)) {
                if (loose) { continue }
                addInvalidity(
                    invalidities,
                    PROPERTY_UNEXPECTED,
                    nextDepth,
                    arg[key],
                    values
                )
            } else {
                validate(validation[key], {}, arg[key], {
                    greedy, values, invalidities, depth: nextDepth,
                })
            }

            if (prevInvaliditiesLength < invalidities.length) {
                setKey(invalidities, prevInvaliditiesLength, key, depth)
                if (!greedy) { return invalidities }
            }
        }

        if (optional) {
            let o = {}
            for (let field of optional) {
                o[field] = true
            }
            optional = o
        } else {
            optional = {}
        }

        if (!loose) {
            for (let key in validation) {
                if (validation.hasOwnProperty(key) && !optional[key]
                    && !hasEnumerableProp(arg, key)) {
                    addInvalidity(invalidities, PROPERTY_MISSING, nextDepth)
                    setKey(invalidities, invalidities.length - 1, key, depth)
                    if (!greedy) { return invalidities }
                }
            }
        }

        if (initialInvaliditiesLength < invalidities.length) {
            if (label !== INVALID) {
                addInvalidity(invalidities, label, depth, arg, values)
            }
            return invalidities
        } else {
            return null
        }
    }

    return addInvalidity(invalidities, label, depth, arg, values)
}

function addInvalidity (invalidities, error, depth = 0, value, includeValues) {
    const path = new Array(depth)
    const invalidity = includeValues ? { path, error, value } : { path, error }
    invalidities.push(invalidity)
    return invalidities
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

function applyPush (to, from) {
    Array.prototype.push.apply(to, from)
    return to
}
