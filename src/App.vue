<template>
  <img alt="Vue logo" src="./assets/logo.png"/>
  <HelloWorld msg="Hello Vue 3 + Vite"/>

  <!--  为什么:value需要加:，而theme不需要加:呢-->
  <Rate :value="score" @update-rate="update"></Rate>
  <Rate :value="3" theme="red"></Rate>
  <Rate :value="2" theme="yellow"></Rate>
</template>

<script setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup
import HelloWorld from './components/HelloWorld.vue'

import Rate from './components/Rate3.vue'
import {ref} from "vue";

let score = ref(3.5)

function update(num) {
  score.value = num
}

</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
