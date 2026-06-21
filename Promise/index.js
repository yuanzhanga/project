//queueMicrotask
class Promises {
  static Pending = "待定";
  static Fulfilled = "成功";
  static Rejected = "失败";

  constructor(fn) {
    this.state = Promises.Pending;
    this.result = null;
    this.resolveCallbacks = [];
    this.rejectCallbacks = [];

    try {
      fn(this.resolve.bind(this), this.reject.bind(this));
    } catch (e) {
      this.reject(e);
    }
  }

  resolve(result) {
    queueMicrotask(() => {
      if (this.state === Promises.Pending) {
        this.state = Promises.Fulfilled;
        this.result = result;
        this.resolveCallbacks.forEach((fn) => {
          fn(this.result);
        });
      }
    });
  }

  reject(result) {
    queueMicrotask(() => {
      if (this.state === Promises.Pending) {
        this.state = Promises.Rejected;
        this.result = result;
        this.rejectCallbacks.forEach((fn) => {
          fn(this.result);
        });
      }
    });
  }

  then(onFulfilled = () => {}, onRejected = () => {}) {
    return new Promises((res, rej) => {
      const handleResult = (result, callback) => {
        try {
          const ret = callback(result);
          if (ret instanceof Promises) {
            ret.then(res, rej);
          } else {
            res(ret);
          }
        } catch (e) {
          rej(e);
        }
      };

      if (this.state === Promises.Pending) {
        this.resolveCallbacks.push(() =>
          handleResult(this.result, onFulfilled),
        );
        this.rejectCallbacks.push(() => handleResult(this.result, onRejected));
      } else if (this.state === Promises.Fulfilled) {
        queueMicrotask(() => handleResult(this.result, onFulfilled));
      } else if (this.state === Promises.Rejected) {
        queueMicrotask(() => handleResult(this.result, onRejected));
      }
    });
  }
}
