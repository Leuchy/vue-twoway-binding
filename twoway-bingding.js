function Vue(option){
  this.data = option.data; // @:需要被劫持的data对象
  Object.defineProperty(this, '$el', {	// @:利用defineProperty方法，禁止挂在的根节点被更改
    configurable: false,
    enumerable: true,
    get: function() {
      return document.getElementById(option.el.split('#')[1])
    },
    set: function() {
      console.error('Cannot change $el')
    }
  })
  watch(this.data); // @:监听数据变化
  new Compile(this)// @:建立DOM和数据间的连接
}
function watch(data){
  // 合法性验证
  if (!data || typeof data !== 'object'){
    return;
  }

  Object.keys(data).forEach(function(key){
    defineReactive(data, key, data[key]); // @:为每个key添加双向绑定
  })
}
function defineReactive(data, key, value){
  var subject = new Subject();
  Object.defineProperty(data, key, {
    configurable: false,
    enumerable: true,
    get: function(){
      // @:触发getter的DOM节点都是数据改变时需要被通知到的节点
      Subject.target && subject.addObserver(Subject.target); // @:将DOM添加为key的观察者
      return value;
    },
    set: function(newVal){
      value = newVal;
      // @:数据被修改时会触发setter, 此时需要通知相关的DOM节点重新渲染
      subject.notify(newVal);
    }
  })
}

// 主题
function Subject() {
  this.observerList = [] // 订阅者列表
}
Subject.prototype = {
  addObserver: function(obs) {
    // @:将订阅者添加到列表中
    this.observerList.push(obs)
  },
  removeObserver: function(obs){
    // @:移除订阅者
    var index = this.observerList.findIndex(function(item){return item===obs});
    this.observerList.splice(index);
  },
  notify: function() {
    // @:当key变化时，调用key对应主题的notify方法
    this.observerList.forEach(function(obs){
      obs.update();
    })
  }
}

// 订阅者
function Observer(vm, key, cb) {
  this.vm = vm;
  this.key = key;
  this.cb = cb;
  this.register();	// @:在new Observer实例时调用，完成DOM传递
}
Observer.prototype = {
  update: function(){
    // @:当主题变化时，会调用所有订阅者的update方法
    this.cb(this.vm.data[this.key], this.value);	// @: 传递oldVal参数
  },
  register: function(){
  	// @:临时借用Subject原型对象
  	Subject.target = this;
  	// @:等号右侧取值,触发data[key]的getter方法,从而调用Subject.addObserver()
  	// @:同时将初始值保存在了观察者实例的value上
  	this.value = this.vm.data[this.key];
  	// @:还原Subject原型上的target, 以便其他Observer实例可以继续借用
  	Subject.target = null;
  }
}

/**
 * 编译对象
 *
 * @param {DOM} el - 根节点
 * @param {Object} vm - Vue对象
 */
function Compile(vm) {
  this.vm = vm
  this.compile(vm.$el)
}
Compile.prototype = {
  compile: function(el) {
    var _this = this
    var reg = /\{\{((\S)*)\}\}$/
    for (var i = 0; i < el.childNodes.length; i++) {
      // @:遍历$el下所有节点
      ;(function(_this) {
        var node = el.childNodes[i]
        if (node.nodeType == 1) {
          if (reg.test(node.textContent)) {
            // @:内容为{{key}}的文本节点
            node.textContent.replace(reg, function(str, key) {
              node.innerHTML = _this.vm.data[key] // @:初始化，将"{{key}}"替换为data[key]的值
              // @:将node注册为key的观察者，以便在数据变化时得到通知并作出响应
              new Observer(_this.vm, key, function(newVal, oldVal){
                console.log(newVal, oldVal);
                node.innerHTML = newVal;
                // FIXME:如何完成oldVal的保存
              })
            })
          } else if (node.tagName == 'INPUT' && node.hasAttribute('v-model')) {
            // @:绑定了v-model的input元素
            var key = node.getAttribute('v-model')
            node.value = _this.vm.data[key] // @:初始化，将input的value替换为data[key]的值
            node.oninput = function() {
              // @:用户输入，更新数据
              _this.vm.data[key] = node.value;
            }
            // @:将node注册为key的观察者，以便在数据变化时得到通知并作出响应
            new Observer(_this.vm, key, function(newVal, oldVal){
              console.log(newVal, oldVal);
              node.value = newVal;
              // FIXME:如何完成oldVal的保存
            })
          }
        } else {
          _this.compile(node)
        }
      })(this)
    }
  },
}