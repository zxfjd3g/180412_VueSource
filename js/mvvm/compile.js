function Compile(el, vm) {
  // 保存vm
  this.$vm = vm;
  // 确定el元素对象并保存
  this.$el = this.isElementNode(el) ? el : document.querySelector(el);
  // 如果el存在
  if (this.$el) {
    // 1. 将el中所有的子节点转移到fragment容器对象中
    this.$fragment = this.node2Fragment(this.$el);
    // 2. 递归遍历fragment中所有层次子节点进行编译
    this.init();
    // 3. 将编译好的fragment插入el元素中
    this.$el.appendChild(this.$fragment);
  }
}

Compile.prototype = {
  node2Fragment: function (el) {
    var fragment = document.createDocumentFragment(),
      child;

    // 将原生节点拷贝到fragment
    while (child = el.firstChild) {
      fragment.appendChild(child);
    }

    return fragment;
  },

  init: function () {
    // 编译指定fragment的所有子节点
    this.compileElement(this.$fragment);
  },

  compileElement: function (el) {
    // 得到所有外层子节点
    var childNodes = el.childNodes,
      me = this;

    // 遍历所有子节点
    [].slice.call(childNodes).forEach(function (node) {
      // 得到节点的文本内容
      var text = node.textContent;
      // 定义用来匹配大括号表达式的正则
      var reg = /\{\{(.*)\}\}/;   // {{name}}
      // 如果当前节点是元素点
      if (me.isElementNode(node)) {
        // 编译元素节点的指令属性
        me.compile(node);
      // 如果当前节点是大括号表达式格式的文本
      } else if (me.isTextNode(node) && reg.test(text)) {
        // 编译大括号表达式文本节点, 传入节点对象及子匹配出的表达式(name)
        me.compileText(node, RegExp.$1);
      }
      // 如果子节点, 还有子节点
      if (node.childNodes && node.childNodes.length) {
        // 递归调用实现所有层次子节点的编译
        me.compileElement(node);
      }
    });
  },

  // 编译元素里的指令
  compile: function (node) {
    // 得到所有的属性节点
    var nodeAttrs = node.attributes,
      me = this;
    // 遍历所有属性
    [].slice.call(nodeAttrs).forEach(function (attr) {
      // 得到属性名: v-on:click
      var attrName = attr.name;
      // 如果是指令属性
      if (me.isDirective(attrName)) {
        // 得到属性值/表达式: test
        var exp = attr.value;
        // 得到指令名: on:click
        var dir = attrName.substring(2);
        // 如果是事件指令
        if (me.isEventDirective(dir)) {
          // 编译事件指令
          compileUtil.eventHandler(node, me.$vm, exp, dir);
        // 普通指令
        } else {
          compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
        }
        // 移除指令属性
        node.removeAttribute(attrName);
      }
    });
  },

  compileText: function (node, exp) {
    compileUtil.text(node, this.$vm, exp);
  },

  isDirective: function (attr) {
    return attr.indexOf('v-') == 0;
  },

  isEventDirective: function (dir) {
    return dir.indexOf('on') === 0;
  },

  isElementNode: function (node) {
    return node.nodeType == 1;
  },

  isTextNode: function (node) {
    return node.nodeType == 3;
  }
};

/*
用于编译的工具对象
 */
var compileUtil = {
  // 解析 v-text/{{}}
  text: function (node, vm, exp) {
    this.bind(node, vm, exp, 'text');
  },

  // 解析 v-html
  html: function (node, vm, exp) {
    this.bind(node, vm, exp, 'html');
  },

  // 解析 v-model
  model: function (node, vm, exp) {
    this.bind(node, vm, exp, 'model');

    var me = this,
      val = this._getVMVal(vm, exp);
    node.addEventListener('input', function (e) {
      var newValue = e.target.value;
      if (val === newValue) {
        return;
      }

      me._setVMVal(vm, exp, newValue);
      val = newValue;
    });
  },

  // 解析 v-class
  class: function (node, vm, exp) {
    this.bind(node, vm, exp, 'class');
  },

  /*
  解析指令最终要调用的方法
    node: 节点
    vm: vm对象
    exp: 表达式  name
    dir: 指令名  text/html/class/model
   */
  bind: function (node, vm, exp, dir) {
    // 得到对应的更新节点的函数
    var updaterFn = updater[dir + 'Updater'];

    // 如果函数存在, 执行函数更新节点(指定节点对象, 更新为什么值)
    updaterFn && updaterFn(node, this._getVMVal(vm, exp));

    new Watcher(vm, exp, function (value, oldValue) {
      updaterFn && updaterFn(node, value, oldValue);
    });
  },

  // 事件处理
  eventHandler: function (node, vm, exp, dir) {
    // 得到事件类型/名: click
    var eventType = dir.split(':')[1],
      // 得到事件的回调函数(从methods中取)
      fn = vm.$options.methods && vm.$options.methods[exp];
    // 如果2者都存在
    if (eventType && fn) {
      // 给节点绑定指定事件类型和回调函数的dom事件监听, 回调函数的this绑定为了vm
      node.addEventListener(eventType, fn.bind(vm), false);
    }
  },

  _getVMVal: function (vm, exp) {
    var val = vm._data;
    exp = exp.split('.');
    exp.forEach(function (k) {
      val = val[k];
    });
    return val;
  },

  _setVMVal: function (vm, exp, value) {
    var val = vm._data;
    exp = exp.split('.');
    exp.forEach(function (k, i) {
      // 非最后一个key，更新val的值
      if (i < exp.length - 1) {
        val = val[k];
      } else {
        val[k] = value;
      }
    });
  }
};

/*
包含多个用于更新节点的方法的对象
 */
var updater = {
  // 更新节点的textContent属性
  textUpdater: function (node, value) {
    node.textContent = typeof value == 'undefined' ? '' : value;
  },

  // 更新节点的innerHTML属性
  htmlUpdater: function (node, value) {
    node.innerHTML = typeof value == 'undefined' ? '' : value;
  },

  // 更新节点的className属性
  classUpdater: function (node, value, oldValue) {
    var className = node.className;
    className = className.replace(oldValue, '').replace(/\s$/, '');

    var space = className && String(value) ? ' ' : '';

    node.className = className + space + value;
  },

  // 更新节点的value属性
  modelUpdater: function (node, value, oldValue) {
    node.value = typeof value == 'undefined' ? '' : value;
  }
};