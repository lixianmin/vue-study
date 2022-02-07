<template>
  <!--  template中
  1. v-bind(:)，用于动态绑定attribute或props到script中声明的表达式， => defineProps
  2. v-on(@)，用于设置事件处理函数 => defineEmits
  3. {{}}填充

  template中可以引用script中使用let/const定义的一些变量
  -->
  <div :style="fontstyle">
    <div class="rate" @mouseout="mouseOut">
      <span @mouseover="mouseOver(num)" v-for="num in 5" :key="num">☆</span>
      <span class="hollow" :style="fontwidth">
        <span @click='onClickNum(num)' @mouseover="mouseOver(num)" v-for="num in 5" :key="num">★</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'

// defineProps用于定义property, 变量props只能在本vue文件中使用，value和theme在外面使用
let props = defineProps({
  value: Number,
  theme: {type: String, default: 'green'}
})

// defineEmits用于定义event发送器（emits）, 变量emits1只能在本vue文件中使用，update-rate则在外面使用
let emits1 = defineEmits('update-rate')

function onClickNum(num) {
  emits1('update-rate', num)
  console.log(`hello ${num}`)
}

const themeObj = {
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

let width = ref(props.value)

function mouseOver(i) {
  width.value = i
}

function mouseOut() {
  width.value = props.value
}

const fontwidth = computed(() => `width:${width.value}em;`)

</script>

<style scoped>
.rate {
  position: relative;
  display: inline-block;
}

.rate > span.hollow {
  position: absolute;
  display: inline-block;
  top: 0;
  left: 0;
  width: 0;
  overflow: hidden;
}
</style>