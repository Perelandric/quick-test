
```javascript
const QuickTest = require("QuickTest")

QuickTest({
  name: "foobar",
  timeout: 4000
},
  t => t.equal("hubba", "hubba", "$1 expected $2 but got $3"),
  function(t) { t.equal(123, 123) },
  function(t) { t.equal(true, true) },
  function(t) { t.equal(false, false) },

  function(t) {
    t.expect(1)

    setTimeout(function() {
      t.all_equal([null, "foo"], [null, "foo"])
    }, 1000)
  }
)
```
