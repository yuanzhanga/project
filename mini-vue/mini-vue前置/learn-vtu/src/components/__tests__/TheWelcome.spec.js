import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import TheWelcome from '../TheWelcome.vue'

describe('HelloWorld', () => {
  it('renders properly', () => {
    const wrapper = mount(TheWelcome, { props: { aaa: 'Hello Vitest' } })
    console.log(wrapper.html())
    expect(wrapper.text()).toContain('Hello Vitest')
  })
  it('1111',async()=>{
    let wrapper = mount(TheWelcome)
    let a = wrapper.get('#btn')
    await a.trigger('click')
    expect(wrapper.text()).toContain('2')
})
})
