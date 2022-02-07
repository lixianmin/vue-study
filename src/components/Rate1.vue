<template>
  <!--  template中
  1. :属性
  2. @事件
  3. {{}}填充

  template中可以引用script中使用let/const定义的一些变量
  -->
  <div :style="fontstyle">
    {{ rate }}
  </div>
</template>

<script setup lang="ts">
import {computed, defineProps} from 'vue'

// defineProps用于定义本组件：Rate1.vue可以被外面访问到的属性，也就是对外交换数据用的，是本组件的get()/set()
let props = defineProps({
  value: Number,
  theme: {type: String, default: 'green'}
})

let rate = computed(() => "★★★★★☆☆☆☆☆".slice(5 - (props as any).value, 10 - (props as any).value))

const themeObj: { [index: string]: string } = {
  'black': '#00',
  'white': '#fff',
  'red': '#f5222d',
  'orange': '#fa541c',
  'yellow': '#fadb14',
  'green': '#73d13d',
  'blue': '#40a9ff',
}

const fontstyle = computed(() => {
  return `color:${themeObj[props.theme]}`
})

</script>