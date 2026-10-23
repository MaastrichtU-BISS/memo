import { createApp, h } from 'vue'
import App from './App.vue'

const app = createApp(App)
// bl-memo's page uses <NuxtLink>; stub it for the Vite demo.
app.component('NuxtLink', {
  props: ['to'],
  setup(props, { slots, attrs }) {
    return () => h('a', { href: props.to, ...attrs }, slots.default?.())
  },
})
app.mount('#app')