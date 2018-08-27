function Observer(data) {
  // 保存data数据
  this.data = data;
  // 开始实现劫持
  this.walk(data);
}

Observer.prototype = {
  walk: function (data) {
    var me = this;
    // 遍历data中所有属性
    Object.keys(data).forEach(function (key) {
      // me.convert(key, data[key]);
      // 对指定属性进行劫持
      me.defineReactive(data, key, data[key])
    });
  },
  /*convert: function(key, val) {
      this.defineReactive(this.data, key, val);
  },*/

  defineReactive: function (data, key, val) {

    // 为当前属性创建对应的dep对象
    var dep = new Dep();
    // 通过隐式递归调用, 实现对所有层次属性的监视/劫持
    var childObj = observe(val);

    // 给data重新定义属性
    Object.defineProperty(data, key, {
      enumerable: true, // 可枚举
      configurable: false, // 不能再define
      // 用来建立dep与watcher的相互关系
      get: function () {
        if (Dep.target) {
          dep.depend();
        }
        return val;
      },
      // 监视data属性值变化
      set: function (newVal) {
        if (newVal === val) {
          return;
        }
        val = newVal;
        // 新的值是object的话，进行监听
        childObj = observe(newVal);
        // 通知订阅者
        dep.notify();
      }
    });
  }
};

function observe(value, vm) {
  // 如果value不是对象直接结束
  if (!value || typeof value !== 'object') {
    return;
  }
  // 创建observer对象
  return new Observer(value);
};


var uid = 0;

function Dep() {
  this.id = uid++;
  this.subs = [];
}

Dep.prototype = {
  addSub: function (sub) {
    this.subs.push(sub);
  },

  depend: function () {
    Dep.target.addDep(this);
  },

  removeSub: function (sub) {
    var index = this.subs.indexOf(sub);
    if (index != -1) {
      this.subs.splice(index, 1);
    }
  },

  notify: function () {
    // 通知所有对应的watcher
    this.subs.forEach(function (sub) {
      sub.update();
    });
  }
};

Dep.target = null;