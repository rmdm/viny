const assert = require('assert-match')

const viny = require('../viny')

const TOP_LEVEL_INVALID = [ { path: [], error: 'invalid' } ]

describe('viny', function () {

    it('returns partially applied function', function () {

        const schema = viny(5)

        assert(typeof schema === 'function')
        assert(schema.length === 2)
    })

    describe('produced function', function () {

        it('returns null when arg strictly equals validation', function () {

            assert.strictEqual(viny(undefined)(undefined), null)
            assert.strictEqual(viny(true)(true), null)
            assert.strictEqual(viny(false)(false), null)
            assert.strictEqual(viny(0)(0), null)

            const obj = {}

            assert.strictEqual(viny(obj)(obj), null)
        })

        it('returns null when validation fn returns true', function () {

            const isTen = arg => arg === 10

            assert.strictEqual(viny(isTen)(10), null)
        })

        it('returns null when arg matches validation object', function () {

            assert.strictEqual(viny({ a: 10 })({ a: 10 }), null)
        })

        it('return null when arg matches deep validation fn', function () {

            const isTen = arg => arg === 10

            const validation = { a: { b: { c: isTen } } }
            const arg = { a: { b: { c: 10 } } }

            assert.strictEqual(viny(validation)(arg), null)
        })

        it('returns null when arrays match', function () {

            const isTen = viny(10)

            assert.strictEqual(viny([[ isTen ]])([[ 10 ]]), null)
        })

        it('returns null when validation passes and label specified',
            function () {

            const isTen = viny(10, { label: 'not_ten' })

            const result = viny(isTen)(10)

            assert.deepStrictEqual(result, null)
        })

        it('returns "invalid" error when arg does not strictly equal '
            + 'to validation', function () {

            assert.deepStrictEqual(viny(undefined)(null), TOP_LEVEL_INVALID)
            assert.deepStrictEqual(viny('')(0), TOP_LEVEL_INVALID)
            assert.deepStrictEqual(viny(10)(11), TOP_LEVEL_INVALID)
        })

        it('returns "invalid" when validation fn returns false', function () {

            const isTen = arg => arg === 10

            assert.deepStrictEqual(viny(isTen)(11), TOP_LEVEL_INVALID)
        })

        it('returns "invalid" when arg does not match validation object',
            function () {

            assert.deepStrictEqual(viny({ a: 10 })({ a: 11 }),
                [ { path: [ 'a' ], error: 'invalid' } ])
        })

        it('returns "property_missing" when arg has less fields than '
            + 'validation object', function () {

            assert.deepStrictEqual(viny({ a: 10, b: 11 })({ a: 10 }),
                [ { path: [ 'b' ], error: 'property_missing' } ])
        })

        it('returns "validation_missing" when arg has more filds than '
            + 'validation object', function () {

            assert.deepStrictEqual(viny({ a: 10 })({ a: 10, b: 11 }),
                [ { path: [ 'b' ], error: 'validation_missing' } ])
        })

        it('return "invalid" when arg does not match deep validation fn',
            function () {

            const isTen = arg => arg === 10

            const validation = { a: { b: { c: isTen } } }
            const arg = { a: { b: { c: 11 } } }

            assert.deepStrictEqual(viny(validation)(arg),
                [ { path: [ 'a', 'b', 'c' ], error: 'invalid' } ])
        })

        it('is returns "invalid" when array contents does not match',
            function () {

            const isTen = viny(10)

            assert.deepStrictEqual(viny([ isTen ])([ 11 ]),
                [ { path: [ '0' ], error: 'invalid' } ])
        })

        it('returns "invalid" when arg does not strictly equal validation',
            function () {

            assert.deepStrictEqual(viny(undefined)(null), TOP_LEVEL_INVALID)
            assert.deepStrictEqual(viny('')(0), TOP_LEVEL_INVALID)
            assert.deepStrictEqual(viny(10)(11), TOP_LEVEL_INVALID)
        })

        it('returns specifed label when validation fails', function () {

            const isTen = viny(10, { label: 'not_ten' })

            const result = viny(isTen)(11)

            assert.deepStrictEqual(result, [ { path: [], error: 'not_ten' } ])
        })

        it('retrun value modification does not affect other calls',
            function () {

            const isTen = arg => arg === 10

            const result = viny(isTen)(11)

            assert.deepStrictEqual(result, TOP_LEVEL_INVALID)

            result[0].path.push('internal')

            assert.deepStrictEqual(viny(isTen)(15), TOP_LEVEL_INVALID)
        })

        it('returns first errors specified on the single level', function () {

            const isTen = viny(10, { label: 'not_ten' })

            const result = viny(
                isTen, { label: 'is_ten_failed' })(11)

            assert.deepStrictEqual(result,
                [ { error: 'not_ten', path: [] } ])
        })

        it('returns first error', function () {

            const validation = viny({
                obj: {
                    a: 10,
                    b: b => typeof b === 'boolean',
                    c: c => typeof c === 'string' && c.length > 10,
                    x: viny([ x => typeof a === 'number', 'not_a_number' ]),
                },
                d: 100,
                e: 1000,
            })

            const result = viny(validation)({
                obj: {
                    a: 10,
                    b: false,
                    c: 'abc',
                    x: '10',
                },
                f: 11,
                d: 100,
            })

            assert.deepStrictEqual(result, [
                { path: [ 'obj', 'c' ], error: 'invalid' },
            ])
        })
    })

    describe('produced function with loose option', function () {

        it('does not return errors when object to validate has more fields '
            + ' than validation', function () {

            const validation = viny(
                { a: a => typeof a === 'number'},
                { loose: true }
            )

            assert.deepStrictEqual(validation({ a: 1, b: 2, c: 3 }), null)
        })

        it('still returns errors on described fields', function () {

            const validation = viny(
                { a: a => typeof a === 'number'},
                { loose: true }
            )

            assert.deepStrictEqual(validation({ a: 'a', b: 2, c: 3 }),
                [ { path: [ 'a' ], error: 'invalid' } ])
        })
    })

    describe('produced function with optional option', function () {

        it('does not return errors when optional fields absent', function () {

            const validation = viny(
                {
                    a: a => typeof a === 'number',
                    b: Array.isArray,
                },
                { optional: [ 'b' ] },
            )

            assert.deepStrictEqual(validation({ a: 1 }), null)
        })

        it('returns errors when optional fields are invalid', function () {

            const validation = viny(
                {
                    a: a => typeof a === 'number',
                    b: Array.isArray,
                },
                { optional: [ 'b' ] },
            )

            assert.deepStrictEqual(validation({ a: 1, b: 2 }),
                [ { path: [ 'b' ], error: 'invalid' } ])
        })

        it('returns errors when non-optional fields are invalid', function () {

            const validation = viny(
                {
                    a: a => typeof a === 'number',
                    b: Array.isArray,
                },
                { optional: [ 'b' ] },
            )

            assert.deepStrictEqual(validation({ a: '1', b: [] }),
                [ { path: [ 'a' ], error: 'invalid' } ])
        })
    })

    describe('ok method', function () {

        it('returns true when arg strictly equals validation', function () {

            assert.strictEqual(viny.ok(undefined, undefined), true)
            assert.strictEqual(viny.ok(true, true), true)
            assert.strictEqual(viny.ok(false, false), true)
            assert.strictEqual(viny.ok(0, 0), true)

            const obj = {}

            assert.strictEqual(viny.ok(obj, obj), true)
        })

        it('returns false when arg does not strictly equal validation',
            function () {

            assert.strictEqual(viny.ok(undefined, null), false)
            assert.strictEqual(viny.ok('', 0), false)
            assert.strictEqual(viny.ok(10, 11), false)
        })

        it('returns true when validation fn returns true', function () {

            const isTen = arg => arg === 10

            assert.strictEqual(viny.ok(isTen, 10), true)
        })

        it('returns false when validation fn returns false', function () {

            const isTen = arg => arg === 10

            assert.strictEqual(viny.ok(isTen, 11), false)
        })

        it('returns true when arg matches validation object', function () {

            assert.strictEqual(viny.ok({ a: 10 }, { a: 10 }), true)
        })

        it('returns false when arg does not match validation object',
            function () {

            assert.strictEqual(viny.ok({ a: 10 }, { a: 11 }), false)
        })

        it('returns false when arg has less fields than validation object',
            function () {

            assert.strictEqual(viny.ok({ a: 10, b: 11 }, { a: 10 }), false)
        })

        it('returns false when arg has more filds than validation object',
            function () {

            assert.strictEqual(viny.ok({ a: 10 }, { a: 10, b: 11 }), false)
        })

        it('return true when arg matches deep validation fn', function () {

            const isTen = arg => arg === 10

            const validation = { a: { b: { c: isTen } } }
            const arg = { a: { b: { c: 10 } } }

            assert.strictEqual(viny.ok(validation, arg), true)
        })

        it('return false when arg does not match deep validation', function () {

            const isTen = arg => arg === 10

            const validation = { a: { b: { c: isTen } } }
            const arg = { a: { b: { c: 11 } } }

            assert.strictEqual(viny.ok(validation, arg), false)
        })

        it('returns partial function when only validation passed', function () {

            const isTen = viny(10)

            const validation = { a: { b: { c: isTen } } }

            const arg = { a: { b: { c: 10 } } }
            const arg2 = { a: { b: { c: 11 } } }

            assert.strictEqual(viny.ok(validation, arg), true)
            assert.strictEqual(viny.ok(validation, arg2), false)
        })

        it('returns false when arrays contents do not match', function () {

            const isTen = viny(10)

            assert.strictEqual(viny.ok([ [ isTen ] ], [ 11 ]), false)
        })

        it('returns true when validation passes and label specified',
            function () {

            const isTen = viny(10, { label: 'not_ten' })

            const result = viny.ok(isTen, 10)

            assert.deepStrictEqual(result, true)
        })

        it('returns false when validation fails and label specified',
            function () {

            const isTen = viny(10, { label: 'not_ten' })

            const result = viny.ok(isTen, 11)

            assert.deepStrictEqual(result, false)
        })

        it('returns false for several validations on the same level',
            function () {

            const isTen = viny(
                viny(10, { label: 'not_ten' }),
                { label: 'is_ten_failed' }
            )

            const result = viny.ok(isTen, 11)

            assert.deepStrictEqual(result, false)
        })

        it('returns false for object with complex structure', function () {

            const validation = viny({
                obj: {
                    a: 10,
                    b: b => typeof b === 'boolean',
                    c: c => typeof c === 'string' && c.length > 10,
                    x: viny([ x => typeof a === 'number', 'not_a_number' ]),
                },
                d: 100,
                e: 1000,
            })

            const result = viny.ok(validation, {
                obj: {
                    a: 10,
                    b: false,
                    c: 'abc',
                    x: '10',
                },
                f: 11,
                d: 100,
            })

            assert.deepStrictEqual(result, false)
        })
    })

    describe('errors method', function () {

        it('returns null when arg strictly equals validation', function () {

            assert.strictEqual(viny.errors(undefined, undefined), null)
            assert.strictEqual(viny.errors(true, true), null)
            assert.strictEqual(viny.errors(false, false), null)
            assert.strictEqual(viny.errors(0, 0), null)

            const obj = {}

            assert.strictEqual(viny.errors(obj, obj), null)
        })

        it('returns null when validation fn returns true', function () {

            const isTen = arg => arg === 10

            assert.strictEqual(viny.errors(isTen, 10), null)
        })

        it('returns null when arg matches validation object', function () {

            assert.strictEqual(viny.errors({ a: 10 }, { a: 10 }), null)
        })

        it('return null when arg matches deep validation fn', function () {

            const isTen = arg => arg === 10

            const validation = { a: { b: { c: isTen } } }
            const arg = { a: { b: { c: 10 } } }

            assert.strictEqual(viny.errors(validation, arg), null)
        })

        it('returns null when arrays match', function () {

            const isTen = viny(10)
            assert.strictEqual(viny.errors([[ isTen ]], [[ 10 ]]), null)
        })

        it('returns null when validation passes and label specified',
            function () {

            const isTen = viny(10, { label: 'not_ten' })
            const result = viny.errors(isTen, 10)

            assert.deepStrictEqual(result, null)
        })

        it('returns "invalid" error when arg does not strictly equal '
            + 'to validation', function () {

            assert.deepStrictEqual(
                viny.errors(undefined, null), TOP_LEVEL_INVALID)
            assert.deepStrictEqual(viny.errors('', 0), TOP_LEVEL_INVALID)
            assert.deepStrictEqual(viny.errors(10, 11), TOP_LEVEL_INVALID)
        })

        it('returns "invalid" when validation fn returns false', function () {

            const isTen = arg => arg === 10

            assert.deepStrictEqual(viny.errors(isTen, 11), TOP_LEVEL_INVALID)
        })

        it('returns "invalid" when arg does not match validation object',
            function () {

            assert.deepStrictEqual(viny.errors({ a: 10 }, { a: 11 }),
                [ { path: [ 'a' ], error: 'invalid' } ])
        })

        it('returns "property_missing" when arg has less fields than '
            + 'validation object', function () {

            assert.deepStrictEqual(viny.errors({ a: 10, b: 11 }, { a: 10 }),
                [ { path: [ 'b' ], error: 'property_missing' } ])
        })

        it('returns "validation_missing" when arg has more filds than '
            + 'validation object', function () {

            assert.deepStrictEqual(viny.errors({ a: 10 }, { a: 10, b: 11 }),
                [ { path: [ 'b' ], error: 'validation_missing' } ])
        })

        it('return "invalid" when arg does not match deep validation fn',
            function () {

            const isTen = arg => arg === 10

            const validation = { a: { b: { c: isTen } } }
            const arg = { a: { b: { c: 11 } } }

            assert.deepStrictEqual(viny.errors(validation, arg),
                [ { path: [ 'a', 'b', 'c' ], error: 'invalid' } ])
        })

        it('is returns "invalid" when array contents does not match',
            function () {

            const isTen = viny(10)
            assert.deepStrictEqual(viny.errors([ isTen ], [ 11 ]),
                [ { path: [ '0' ], error: 'invalid' } ])
        })

        it('returns "invalid" when arg does not strictly equal validation',
            function () {

            assert.deepStrictEqual(
                viny.errors(undefined, null), TOP_LEVEL_INVALID)
            assert.deepStrictEqual(viny.errors('', 0), TOP_LEVEL_INVALID)
            assert.deepStrictEqual(viny.errors(10, 11), TOP_LEVEL_INVALID)
        })

        it('returns specifed label when validation fails', function () {

            const isTen = viny(10, { label: 'not_ten' })
            const result = viny.errors(isTen, 11)

            assert.deepStrictEqual(result, [ { path: [], error: 'not_ten' } ])
        })

        it('retrun value modification does not affect other calls',
            function () {

            const isTen = arg => arg === 10

            const result = viny.errors(isTen, 11)

            assert.deepStrictEqual(result, TOP_LEVEL_INVALID)

            result[0].path.push('internal')

            assert.deepStrictEqual(viny.errors(isTen, 15), TOP_LEVEL_INVALID)
        })

        it('returns first errors specified on the single level', function () {

            const isTen = viny(
                viny(10, { label: 'not_ten' }),
                { label: 'is_ten_failed' }
            )

            const errors = viny.errors(isTen, 11)

            assert.deepStrictEqual(errors,
                [ { error: 'not_ten', path: [] } ])
        })

        it('returns first error by default', function () {

            const validation = viny({
                obj: {
                    a: 10,
                    b: b => typeof b === 'boolean',
                    c: c => typeof c === 'string' && c.length > 10,
                    x: viny([ x => typeof a === 'number', 'not_a_number' ]),
                },
                d: 100,
                e: 1000,
            })

            const errors = viny.errors(validation, {
                obj: {
                    a: 10,
                    b: false,
                    c: 'abc',
                    x: '10',
                },
                f: 11,
                d: 100,
            })

            assert.deepStrictEqual(errors, [
                { path: [ 'obj', 'c' ], error: 'invalid' },
            ])
        })

        it('returns multiple errors specified on the same level when greedy '
            + 'option passed', function () {

            const isTen = viny(10, { label: 'not_ten' })

            const result = viny(
                isTen, { label: 'is_ten_failed' })(11, { greedy: true })

            assert.deepStrictEqual(result, [
                { error: 'not_ten', path: [] },
                { error: 'is_ten_failed', path: [] },
            ])
        })

        it('returns all errors when greedy option passed', function () {

            const validation = viny({
                obj: viny(
                    {
                        a: 10,
                        b: b => typeof b === 'boolean',
                        c: c => typeof c === 'string' && c.length > 10,
                        x: viny(
                            x => typeof a === 'number',
                            { label: 'not_a_number' }
                        ),
                    },
                    { label: 'failed' }
                ),
                d: 100,
                e: 1000,
            })

            const result = viny(validation)({
                obj: {
                    a: 10,
                    b: false,
                    c: 'abc',
                    x: '10',
                },
                f: 11,
                d: 100,
            }, { greedy: true })

            assert.deepStrictEqual(result, [
                { path: [ 'obj', 'c' ], error: 'invalid' },
                { path: [ 'obj', 'x' ], error: 'not_a_number' },
                { path: [ 'obj' ], error: 'failed' },
                { path: [ 'f' ], error: 'validation_missing' },
                { path: [ 'e' ], error: 'property_missing' },
            ])
        })

        it('returns all errors with values when greedy & values options passed',
            function () {

            const validation = viny({
                obj: viny(
                    {
                        a: 10,
                        b: b => typeof b === 'boolean',
                        c: c => typeof c === 'string' && c.length > 10,
                        x: viny(
                            x => typeof a === 'number',
                            { label: 'not_a_number' }
                        ),
                    },
                    { label: 'failed' }
                ),
                d: 100,
                e: 1000,
            })

            const result = viny(validation)({
                obj: {
                    a: 10,
                    b: false,
                    c: 'abc',
                    x: '10',
                },
                f: 11,
                d: 100,
            }, { greedy: true, values: true })

            assert.deepStrictEqual(result, [
                { path: [ 'obj', 'c' ], error: 'invalid', value: 'abc' },
                { path: [ 'obj', 'x' ], error: 'not_a_number', value: '10' },
                { path: [ 'obj' ], error: 'failed', value: {
                        a: 10, b: false, c: 'abc', x: '10',
                    }
                },
                { path: [ 'f' ], error: 'validation_missing', value: 11 },
                { path: [ 'e' ], error: 'property_missing' },
            ])
        })
    })

    describe('and method', function () {

        it('returns partially applied function', function () {

            const schema = viny.and(5)

            assert(typeof schema === 'function')
            assert(schema.length === 2)
        })

        describe('produced function', function () {

            it('returns null when all validations passed', function () {

                const gt10 = viny(x => x > 10)
                const validation = viny.and(gt10, x => x < 20)

                assert.deepStrictEqual(validation(15), null)
            })

            it('returns "invalid" when some validations failed', function () {

                const gt10 = viny(x => x > 10)
                const validation = viny.and(gt10, x => x < 20)

                assert.deepStrictEqual(validation(25), TOP_LEVEL_INVALID)
            })

            it('returns custom message when validations failed', function () {

                const gt10 = viny(x => x > 10, { label: 'lt_10' })
                const lt20 = viny(x => x < 20, { label: 'gt_20' })
                const validation = viny.and(gt10, lt20)

                assert.deepStrictEqual(validation(25),
                    [ { path: [], error: 'gt_20' } ])
            })

            it('returns single message when greedy option not passed',
                function () {

                const gt10 = viny(x => x < 10, { label: 'gt_10' })
                const lt20 = viny(x => x < 20, { label: 'gt_20' })
                const validation = viny.and(gt10, lt20)

                assert.deepStrictEqual(validation(25), [
                    { path: [], error: 'gt_10' },
                ])
            })

            it('returns single message even with greedy option', function () {

                const lt10 = viny(x => x < 10, { label: 'gt_10' })
                const lt20 = viny(x => x < 20, { label: 'gt_20' })
                const validation = viny.and(lt10, lt20)

                assert.deepStrictEqual(validation(25, { greedy: true }), [
                    { path: [], error: 'gt_10' },
                ])
            })

            it('returns single message when nested even with greedy option',
                function () {

                const lt10 = viny(x => x < 10, { label: 'gt_10' })
                const lt20 = viny(x => x < 20, { label: 'gt_20' })
                const validation = viny({
                    a: viny.and(lt10, lt20),
                })

                assert.deepStrictEqual(validation({a: 25}, { greedy: true }), [
                    { path: [ 'a' ], error: 'gt_10' },
                ])
            })
        })
    })

    describe('or method', function () {

        it('returns partially applied function', function () {

            const schema = viny.or(5)

            assert(typeof schema === 'function')
            assert(schema.length === 2)
        })

        describe('produced function', function () {

            it('returns null when all validations passed', function () {

                const eq10 = viny(10)
                const validation = viny.or(eq10, 20)

                assert.deepStrictEqual(validation(20), null)
            })

            it('returns "invalid" when some validations failed', function () {

                const eq10 = viny(10)
                const validation = viny.or(eq10, 20)

                assert.deepStrictEqual(validation(15), [
                    { path: [], error: 'invalid' },
                    { path: [], error: 'invalid' },
                ])
            })

            it('returns all messages when validations failed', function () {

                const eq10 = viny(10, { label: 'not_10' })
                const eq20 = viny(20)
                const validation = viny.or(eq10, eq20)

                assert.deepStrictEqual(validation(15),[
                    { path: [], error: 'not_10' },
                    { path: [], error: 'invalid' },
                ])
            })

            it('returns all error messages when nested even without greedy option', function () {

                const lt10 = viny(x => x < 10, { label: 'gt_10' })
                const lt20 = viny(x => x < 20, { label: 'gt_20' })
                const validation = viny({
                    a: viny.or(lt10, lt20),
                })

                assert.deepStrictEqual(validation({a: 25}), [
                    { path: [ 'a' ], error: 'gt_10' },
                    { path: [ 'a' ], error: 'gt_20' },
                ])
            })

            it('returns all messages when nested with greedy option', function () {

                const lt10 = viny(x => x < 10, { label: 'gt_10' })
                const lt20 = viny(x => x < 20, { label: 'gt_20' })
                const validation = viny({
                    a: viny.or(lt10, lt20),
                })

                assert.deepStrictEqual(validation({a: 25}, { greedy: true }), [
                    { path: [ 'a' ], error: 'gt_10' },
                    { path: [ 'a' ], error: 'gt_20' },
                ])
            })
        })
    })

    describe('not method', function () {

        it('returns partially applied function', function () {

            const schema = viny.not(5)

            assert(typeof schema === 'function')
            assert(schema.length === 2)
        })

        describe('produced function', function () {

            it('returns "invalid" when some validations passed', function () {

                const validation = viny.not(10)

                assert.deepStrictEqual(validation(10), TOP_LEVEL_INVALID)
            })

            it('returns null when some validations failed', function () {

                const validation = viny.not(10)

                assert.deepStrictEqual(validation(11), null)
            })

            it('returns null when nested without error', function () {

                const validation = viny({
                    a: viny.not(10),
                })

                assert.deepStrictEqual(validation({ a: 11 }), null)
            })

            it('returns error when nested with errors', function () {

                const validation = viny({
                    a: viny.not(10),
                })

                assert.deepStrictEqual(validation({ a: 10 }),
                    [ { path: [ 'a' ], error: 'invalid' } ])
            })
        })
    })

    describe('every method', function () {

        it('returns partially applied function', function () {

            const schema = viny.every(5)

            assert(typeof schema === 'function')
            assert(schema.length === 2)
        })

        describe('produced function', function () {

            it('returns "invalid" when not an array passed', function () {

                const validation = viny.every(10)

                assert.deepStrictEqual(validation(10),
                    [ { path: [], error: 'not_an_array' } ])
            })

            it('returns null when validation passed for each array element',
                function () {

                const validation = viny.every(10)

                assert.deepStrictEqual(validation([ 10, 10, 10 ]), null)
            })

            it('returns error when some item is not valid', function () {

                const lt10 = viny(x => x < 10, { label: 'gte_10' })

                const validation = viny.every(lt10)

                assert.deepStrictEqual(validation([ 5, 10, 15 ]),
                    [ { path: [ '1' ], error: 'gte_10' }])
            })

            it('returns null for nested array validation passed', function () {

                const lt10 = viny(x => x < 10, { label: 'gte_10' })

                const validation = viny({
                    a: viny.every(lt10),
                })

                assert.deepStrictEqual(validation({ a: [ 5, 6, 7 ] }), null)
            })

            it('returns error for nested array when several elements are invalid',
                function () {

                const lt10 = viny(x => x < 10, { label: 'gte_10' })

                const validation = viny({
                    a: viny.every(lt10),
                })

                assert.deepStrictEqual(validation({ a: [ 5, 10, 15 ] }),
                    [ { path: [ 'a', '1' ], error: 'gte_10' }])
            })

            it('returns multiple errors for nested array when several elements '
                + ' are invalid end greedy option passed', function () {

                const lt10 = viny(x => x < 10, { label: 'gte_10' })

                const validation = viny({
                    a: viny.every(lt10),
                })

                assert.deepStrictEqual(validation(
                    { a: [ 5, 10, 5, 15 ] },
                    { greedy: true }
                ), [
                    { path: [ 'a', '1' ], error: 'gte_10' },
                    { path: [ 'a', '3' ], error: 'gte_10' },
                ])
            })
        })
    })

    describe('some method', function () {

        it('returns partially applied function', function () {

            const schema = viny.some(5)

            assert(typeof schema === 'function')
            assert(schema.length === 2)
        })

        describe('produced function', function () {

            it('returns "invalid" when not an array passed', function () {

                const validation = viny.some(10)

                assert.deepStrictEqual(validation(10),
                    [ { path: [], error: 'not_an_array' } ])
            })

            it('returns null when validation passed for some array element',
                function () {

                const validation = viny.some(10)

                assert.deepStrictEqual(validation([ 9, 10, 11 ]), null)
            })

            it('returns error when all items are not valid', function () {

                const lt10 = viny(x => x < 10, { label: 'gte_10' })

                const validation = viny.some(lt10)

                assert.deepStrictEqual(validation([ 15, 10, 15 ]), [
                        { path: [ '0' ], error: 'gte_10' },
                        { path: [ '1' ], error: 'gte_10' },
                        { path: [ '2' ], error: 'gte_10' },
                ])
            })

            it('returns null when at least one validation passed', function () {

                const lt10 = viny(x => x < 10, { label: 'gte_10' })

                const validation = viny({
                    a: viny.some(lt10),
                })

                assert.deepStrictEqual(validation(
                    { a: [ 5, 10, 5, 15 ] }
                ), null)
            })

            it('returns all errors for nested array when all elements '
                + ' are invalid', function () {

                const lt10 = viny(x => x < 10, { label: 'gte_10' })

                const validation = viny({
                    a: viny.some(lt10),
                })

                assert.deepStrictEqual(validation(
                    { a: [ 15, 10, 25, 15 ] }
                ), [
                    { path: [ 'a', '0' ], error: 'gte_10' },
                    { path: [ 'a', '1' ], error: 'gte_10' },
                    { path: [ 'a', '2' ], error: 'gte_10' },
                    { path: [ 'a', '3' ], error: 'gte_10' },
                ])
            })
        })
    })
})
