<template>
  <div id="mainPanel"></div>
  <div id="inputBoxDiv">
    <input id="inputBox" ref="mainPanel" v-model="text" placeholder="Tab补全命令, Enter执行命令"
           @keydown.enter.prevent="on_enter"
    />
  </div>
</template>

<script setup lang="ts">
import {printHtml, printWithTimestamp} from "./lib/main_panel";
import StartX from "./lib/starx";

// 变量
let text = ""
let url = "ws://127.0.0.1:8888/ws/" // todo 这个地址必须以/结尾, 否则连不上, 有些奇怪

let starx = new StartX
starx.init({url: url}, function () {
  console.log("starx init")
})

starx.on("disconnect", function () {
  printWithTimestamp("<b> disconnected from server </b>");
})

// 事件
function on_enter(evt) {
  printHtml("hello world")
  printWithTimestamp("what is wrong")
}

class Text{
  id :number
  constructor(id:number) {
    this.id = id
  }
}

let m = new Map<number, Text>()
m.set(1, new Text(23))
const item = m.get(1) as Text;


</script>

<style>
/*http://thomasf.github.io/solarized-css/*/
html {
  background-color: #002b36;
  color: #839496;
  margin: 1em;
  font-size: 1.2em;
}

.copy_button {
  background-color: #008CBA;
  border: none;
  color: white;
}

a {
  color: #b58900;
}

a:visited {
  color: #cb4b16;
}

a:hover {
  color: #cb4b16;
}

table {
  border-width: 1px;
  border-color: #729ea5;
  border-collapse: collapse;
}

th {
  background-color: #004949;
  border-width: 1px;
  padding: 8px;
  border-style: solid;
  border-color: #729ea5;
  text-align: left;
}

th:hover {
  cursor: pointer;
}

th:after {
  content: attr(data-text);
  font-size: small;
  margin-left: 5px;
}

td {
  border-width: 1px;
  padding: 8px;
  border-style: solid;
  border-color: #729ea5;
}

/*https://www.runoob.com/css/css-tooltip.html*/
.tips {
  position: relative;
  display: inline-block;
  border-bottom: 1px dotted black;
}

.tips .tips_text {
  visibility: hidden;
  display: inline-block;
  white-space: nowrap;
  background: #005959;
  border-radius: 6px;
  padding: 6px 6px;
  /* 定位 */
  position: absolute;
  z-index: 1;
  top: -5px;
  left: 105%;
}

.tips:hover .tips_text {
  visibility: visible;
}

#mainPanel {
  margin: 0;
  padding: 0.5em 0.5em 0.5em 0.5em;
  position: absolute;
  top: 0.5em;
  left: 0.5em;
  right: 0.5em;
  bottom: 3em;
  overflow: auto;
}

#inputBoxDiv {
  padding: 0 0.5em 0 0.5em;
  margin: 0;
  position: absolute;
  bottom: 1em;
  left: 1px;
  width: 100%;
  overflow: hidden;
}

#inputBox {
  width: 100%;
  height: 1.6em;
  font-size: 1.5em;
  background-color: #073642;
  color: #859900
}
</style>
