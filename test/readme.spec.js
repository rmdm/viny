const assert = require('assert-match')
const viny = require('../viny')

describe('readme', function () {

    it('main example', function () {

        const userSchema = viny({
            login: name => typeof name === 'string',
            avatar: viny(Buffer.isBuffer, { label: 'not_a_buffer' }),
            achievements: viny.every({
                type: type => typeof type === 'string',
                level: type => typeof level === 'number',
            }),
        })

        const user = {
            login: 'bob',
            avatar: null,
            achievements: [ { kind: 'beginner', level: '' } ],
        }

        assert.deepStrictEqual(viny.errors(userSchema, user, { greedy: true, values: true }), [
            { path: [ 'avatar' ], error: 'not_a_buffer', value: null },
            { path: [ 'achievements', '0', 'kind' ], error: 'validation_missing', value: 'beginner' },
            { path: [ 'achievements', '0', 'level' ], error: 'invalid', value: '' },
            { path: [ 'achievements', '0', 'type' ], error: 'property_missing' },
        ])
    })
})
