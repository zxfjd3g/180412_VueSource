/*
用来监视模板中的表达式
exp: 表达式
cb: 用来更新节点的回调函数
 */
function Watcher(vm, exp, cb) {
  //
  this.cb = cb;
  this.vm = vm;
  this.exp = exp;
  this.depIds = {}; // 用来保存相关dep对象的容器对象 key是dep的id, value是dep
  this.value = this.get(); // 表达式的值
}

Watcher.prototype = {
  update: function () {
    this.run();
  },
  run: function () {
    // 得到表达式最新的值
    var value = this.get();
    // 得到表达式老值
    var oldVal = this.value;
    // 值有变化
    if (value !== oldVal) {
      // 保存最新的值
      this.value = value;
      // 调用保存的更新节点的回调函数去更新界面对应节点
      this.cb.call(this.vm, value, oldVal);
    }
  },
  addDep: function (dep) {
    // 判断关系是否已经建立
    if (!this.depIds.hasOwnProperty(dep.id)) {
      // 将watcher添加到dep中--> dep到watcher关系
      dep.addSub(this);
      // 将dep添加到watcher中--> watcher到dep的关系
      this.depIds[dep.id] = dep;
    }
  },

  // 得到表达式对应的值, 同时去建立dep与watcher的关系
  get: function () {
    Dep.target = this;
    var value = this.getVMVal();
    Dep.target = null;
    return value;
  },

  // 得到表达式对应的值
  getVMVal: function () {
    var exp = this.exp.split('.');
    var val = this.vm._data;
    exp.forEach(function (k) {
      val = val[k];
    });
    return val;
  }
};