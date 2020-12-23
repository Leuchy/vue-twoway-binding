> HTML文件准备

1. 引入vue.js

2. 声明式渲染

   ```html
   <div id="app">
     <input v-model="str"></input>
   	<p>{{str}}</p>
   </div>
   ```

   ```js
   var app = new Vue({
     el: '#app',
     data: {
       str: 'hello'
     }
   })
   ```

3. 更改数据观察DOM响应

   ```js
   setTimeout(function () {
     app.data.str = 'world'
   }, 3000)
   ```

<br />



> Object.defineProperty中通过getter和setter劫持数据变化

```js
function Vue(option){
  this.data = option.data; // @:需要被劫持的data对象
  Object.defineProperty(this, '$el', {	// @:利用defineProperty方法，禁止挂在的根节点被更改
    configurable: false,
    enumerable: true,
    get: function() {
      return document.getElementById(opt.el.split('#')[1])
    },
    set: function() {
      console.error('Cannot change $el')
    }
  })
  watch(this.data); // @:监听数据变化
  // TODO:建立DOM和数据间的连接
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
  Object.defineProperty(data, key, {
    configurable: false,
    enumerable: true,
    get: function(){
      // TODO:触发getter的DOM节点都是数据改变时需要被通知到的节点
      ;
      return value;
    },
    set: function(newVal){
      value = newVal;
      // TODO:数据被修改时会触发setter, 此时需要通知相关的DOM节点重新渲染
      ;
    }
  })
}
```

<br />



> 观察者模式

**观察者模式v.s.发布订阅模式**：假设我是一个卖菜的，观察者模式是我把固定来买菜的5个客户拉了个微信群，每天在群里通知今日菜价——我和客户之间是松耦合的；发布订阅模式是我弄了个公众号，每天在公众号上更新菜价，客户订阅公众号后获取消息——我和客户之间是完全解耦的，互相不认识

**为了简化代码，便于理解，我们这里用观察者模式实现**

主题：一个可以被订阅的对象（报纸）

1. 内部有一个observers数组，其中记录了所有的订阅者（客户清单）
2. 提供addObserver和removeObserver方法更新订阅者（维护客户清单)
3. 提供一个notify方法，当主题发生变化时，通知所有的订阅者（有新一期报纸出版时，通知客户）

观察者：

1. 内部有一个subject对象，记录订阅的是什么主题（定了什么报纸）
2. 提供一个update方法，用于响应主题的变化（收到报纸更新的通知后，取回报纸并阅读）

```js
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
function Observer(subject) {
  this.subject = subject;
}
Observer.prototype = {
  update: function() {
    // TODO:当主题变化时，会调用所有订阅者的update方法
  }
}
```

<br />



> data中的每个key都是一个主题

```js
function defineReactive(data, key, value){
  var subject = new Subject();
  Object.defineProperty(data, key, {
    configurable: false,
    enumerable: true,
    get: function(){
      // @:触发getter的DOM节点都是数据改变时需要被通知到的节点
      subject.addObserver(dom); // TODO:定义dom变量
      return value;
    },
    set: function(newVal){
      value = newVal;
      // @:数据被修改时会触发setter, 此时需要通知相关的DOM节点重新渲染
      subject.notify(newVal);
    }
  })
}
```

<br />



> 编译#app下的模板写法

```js
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
              // TODO:将node注册为key的观察者，以便在数据变化时得到通知并作出响应
            })
          } else if (node.tagName == 'INPUT' && node.hasAttribute('v-model')) {
            // @:绑定了v-model的input元素
            var key = node.getAttribute('v-model')
            node.value = _this.vm.data[key] // @:初始化，将input的value替换为data[key]的值
            node.oninput = function() {
              // TODO:用户输入，更新数据
            }
            // TODO:将node注册为key的观察者，以便在数据变化时得到通知并作出响应
          }
        } else {
          _this.compile(node)
        }
      })(this)
    }
  },
}
```

<br />



> 建立DOM和数据间的连接

```js
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
```

<br />



> 每个node都是对应data的观察者

改造Observer：

1. subject实际是data的某个key
2. 接收一个回调方法，在update时调用

```js
function Observer(vm, key, cb) {
  this.vm = vm;
  this.key = key;
  this.cb = cb;
}
Observer.prototype = {
  update: function() {
    // @:当主题变化时，会调用所有订阅者的update方法
    this.cb(this.vm.data[this.key]);	// TODO:除了当前的newVal, 如何传递oldVal
  }
}
```

将node注册为key的观察者:

```js
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
              new Observer(_this.vm, key, function(newVal){ // TODO:如何获取oldVal的值
                node.innerHTML = newVal;
              })
            })
          } else if (node.tagName == 'INPUT' && node.hasAttribute('v-model')) {
            // @:绑定了v-model的input元素
            var key = node.getAttribute('v-model')
            node.value = _this.vm.data[key] // @:初始化，将input的value替换为data[key]的值
            node.oninput = function() {
              // @:用户输入，更新数据
              _this.vm[key] = node.value;
            }
            // @:将node注册为key的观察者，以便在数据变化时得到通知并作出响应
            new Observer(_this.vm, key, function(newVal){ // TODO:如何获取oldVal的值
              node.value = newVal;
            })
          }
        } else {
          _this.compile(node)
        }
      })(this)
    }
  },
}
```

<br />



> 传递DOM

声明Observer时可以获取每一个DOM，因此，可以考虑在new Observer对象时完成DOM的传递

```js
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
```

将真正的DOM添加为key的观察者

```js
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
```

<br />



> 思考：如何获得正确的oldVal值

```js
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
```

<br />



>参考资料

[Observer vs Pub-Sub pattern](https://hackernoon.com/observer-vs-pub-sub-pattern-50d3b27f838c)

[vue中数据绑定原理的设计模式到底观察者还是发布订阅？ - 张逸影的回答 - 知乎](https://www.zhihu.com/question/419154194/answer/1581917388)

还有两篇2年前分别在[segmentfault](https://segmentfault.com/)和[掘金](https://juejin.cn/)上看的文章，已经找不到原文了: (