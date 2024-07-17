import { createApp } from 'vue'
import './style.css'
// @ts-ignore
import App from './App.vue'
import ToyElement from 'toy-element'

createApp(App).use(ToyElement).mount('#app')
