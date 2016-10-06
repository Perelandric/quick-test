
const re_func = /function\s+([$_a-zA-Z][$_a-zA-Z0-9]*)/
const def_arr = ["", ""]

const PENDING = 1

// Individual assertion result
const PASSED = 2
const FAILED = 3

// Test function anomaly
const CAUGHT = 4
const TIMEOUT = 5

// Before and after a group of tests
const SETUP = 6
const TEARDOWN = 7

// Before and after an individual test
const PREPARE = 8
const FINISH = 9


var test_count = 0


module.exports = function QuickTest(props, ...tests) {
  var t = new _Tests(++test_count, props, ...tests)
  console.log("Preparing: " + t._name)
  setTimeout(() => t._run(), 15)
}


function fn_name(fn, i) {
  return fn.name || (re_func.exec(fn) || def_arr)[1] || ("Func #" + i)
}


class _Tests {
  constructor(num, props, ...tests) {
    this._complete = false
    this._num = num

    this._name = props.name ? (props.name + "") : ("Test #" + this._num)

    this._on = props.on || {}

    this._timeout = +props.timeout
    if (!Number.isInteger(this._timeout) || this._timeout < 0) {
      this._timeout = 5000
    }


    this._total = tests.length
    this._success = 0
    this._fail = 0
    this._caught = 0
    this._timeout = 0

    this._trigger(SETUP)

    this._tests = tests.map((fn, i) => {
      return new _Test(this, fn, i)
    })
  }

  _run() {
    this._tests.forEach(t => {
      this._trigger(PREPARE, t)

      try {
        t._run()
      } catch (e) {
        t._complete_with(CAUGHT, e)
      }
    })

    if (this._all_complete()) {
      this._trigger(TEARDOWN)

    } else {
      this._timeout_id = setTimeout(() => {
        this._tests.forEach(t => {
          if (t._is_complete() === false) {
            t._complete_with(TIMEOUT)
          }
        })

        this._trigger(TEARDOWN)
      }, this._timeout)
    }
  }

  _all_complete() {
    return this._success + this._fail + this._caught + this._timeout === this._total
  }

  _trigger(state, test) {
    switch (state) {
    case SETUP:
      break

    case PREPARE:
      break

    case FINISH:
      switch (test._status) {
      case PENDING:
        throw new Error("Internal error")
      case FAILED:
        this._fail += 1; break
      case PASSED:
        this._pass += 1; break
      case CAUGHT:
        this._caught += 1; break
      case TIMEOUT:
        this._timeout += 1; break
      }

      if (this._all_complete()) {
        this._trigger(TEARDOWN)
      }
      break

    case TEARDOWN:
      if (this._complete) {
        console.log("unexpected completion after teardown")
        return
      }

      this._complete = true

      if (this._timeout_id != null) {
        clearTimeout(this._timeout_id)
        this._timeout_id = null
      }

      console.log("\n\n" + this._name + "\n===================================")

      this._tests.forEach(t => {
        const s = "  " + t._name + ": %s"

        if (t._fail_msgs.length) {
          console.log(s, "FAIL")
          t._fail_msgs.forEach(m => console.log("    %s", m))
        } else {
          console.log(s, "PASS")
        }
      })

      break

    default:
      throw "Internal error"
    }
  }
}

class _Test {
  constructor(tests, fn, i) {
    this._all = false

    this._expect = Infinity
    this._status = PENDING
    this._fail_msgs = []

    this._parent = tests
    this._func = fn
    this._name = fn_name(fn, i)
  }

  _run() {
    this._func.call(null, this)

    if (this._expect === Infinity || this._expect <= 0) {
      this._complete_with(this._fail_msgs.length ? FAILED : PASSED)
    }
  }

  _is_complete() {
    return this._status !== PENDING
  }

  _complete_with(status, err) {
    this._status = status
    if (status === TIMEOUT) {
      this._fail_msgs.push("[TIMEOUT]")

    } else if (err) {
      this._fail_msgs.push("[CAUGHT] " + err.toString())
    }

    this._parent._trigger(FINISH, this)
  }

  _set_assert_result(res, fail_msg) {
    if (this._is_complete()) {
      console.log("%s: unexpected assertion after completion.", this._name)
      return res
    }

    if (!res) {
      this._fail_msgs.push(fail_msg)
    }

    if (this._expect !== Infinity) {
      this._expect -= 1

      if (this._expect <= 0) {
        this._complete_with(this._fail_msgs.length ? FAILED : PASSED)
      }
    }

    return res
  }

  expect(n) {
    if (!Number.isInteger(n)) {
      return
    }
    if (this._expect === Infinity) {
      this._expect = 0
    }
    this._expect += n
  }

  get all() {
    this._all = true
    return this
  }

  _do(expected, found, predicate, fail_msg) {
    if (this._all) {
      this._all = false

      return this._set_assert_result(
              expected.length === found.length &&
              expected.every(function(item, i) {
                return predicate(found[i], item)
              }),
      fail_msg)
    }

    return this._set_assert_result(predicate(expected, found), fail_msg)
  }

  // Assertions
  equal(a, b, fail_msg) {
    return this._do(a, b, (a, b) => a === b, fail_msg)
  }
  not_equal(a, b, fail_msg) {
    return this._do(a, b, (a, b) => a !== b, fail_msg)
  }

  true(a, fail_msg) {
    return this.equal(this._all ? Array(a.length).fill(true) : true, a, fail_msg)
  }
  truthy(a, fail_msg) {
    return this.true(this._all ? a.map(x=>!!x) : !!a, fail_msg)
  }

  false(a, fail_msg) {
    return this.equal(this._all ? Array(a.length).fill(false) : false, a, fail_msg)
  }
  falsey(a, fail_msg) {
    return this.false(this._all ? a.map(x=>!!x) : !!a, fail_msg)
  }
}
