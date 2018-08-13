viny
====

`viny` is a tiny functional-style validator.

Example
=======

```javascript
const v = require('viny')

const userSchema = v({
    login: name => typeof name === 'string',
    avatar: v(Buffer.isBuffer, { label: 'not_a_buffer' }),
    achievements: v.every({
        type: type => typeof type === 'string',
        level: type => typeof level === 'number',
    }),
})

const user = {
    login: 'bob',
    avatar: null,
    achievements: [ { kind: 'beginner', level: '' } ],
}

console.log(v.errors(userSchema, user, { greedy: true, values: true }))
/*
    prints:
    [
        { path: [ 'avatar' ], error: 'not_a_buffer', value: null },
        { path: [ 'achievements', '0', 'kind' ], error: 'property_unexpected', value: 'beginner' },
        { path: [ 'achievements', '0', 'level' ], error: 'invalid', value: '' },
        { path: [ 'achievements', '0', 'type' ], error: 'property_missing' },
    ]
*/
```
