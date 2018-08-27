function MVVM(options) {
  // 保存配置对象到vm上
  this.$options = options;
  // 保存data数据对象到vm和data变量上
  var data = this._data = this.$options.data;
  // 保存vm到me变量
  var me = this;

  // 遍历data中所有属性
  Object.keys(data).forEach(function (key) {// key是属性名: name
    // 对指定属性实现数据代理
    me._proxy(key);
  });

  observe(data, this);

  // 创建编译对象(编译模板)
  this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
  $watch: function (key, cb, options) {
    new Watcher(this, key, cb);
  },

  _proxy: function (key) {
    // 保存vm
    var me = this;
    // 给vm添加指定属性名的属性
    Object.defineProperty(me, key, {
      configurable: false, // 指定属性不能重新定义修改
      enumerable: true, // 可以枚举
      // 当我们执行vm.xxx读取属性值时, 自动调用, 返回data中对应属性的值
      get: function proxyGetter() {
        return me._data[key];
      },
      // 当我们执行vm.xxx = value设置新的值时, 自动调用, 将最新值设置为data中对应的属性的值
      set: function proxySetter(newVal) {
        me._data[key] = newVal;
      }
    });
  }
};