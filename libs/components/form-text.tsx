import React, { useEffect, useMemo } from 'react'
import { Input, Tabs, Textarea, useInput, useTabs } from '@geist-ui/react'

export type FormTextProps = {
  error?: string | boolean
  onChange: (val: string) => void
}

const FormText: React.FC<FormTextProps> = ({ error, onChange }) => {
  const { bindings: textBindings, state: textState } = useInput('')
  const { bindings: inputBindings, state: inputState } = useInput('')
  const { bindings, state: tabState } = useTabs('multiline')
  const state = useMemo(() => (tabState === 'multiline' ? textState : inputState), [
    textState,
    inputState,
    tabState,
  ])

  const formHandler = (event: React.SyntheticEvent) => {
    event.preventDefault()
    event.nativeEvent.preventDefault()
  }

  useEffect(() => {
    onChange && onChange(state)
  }, [state])

  return (
    <Tabs initialValue="multiline" hideDivider {...bindings}>
      <Tabs.Item label="Multiline" value="multiline">
        <Textarea
          width="100%"
          {...textBindings}
          status={error ? 'error' : 'default'}
          resize="vertical"
        />
      </Tabs.Item>
      <Tabs.Item label="Password" value="password">
        <form onChange={formHandler}>
          <Input.Password
            {...inputBindings}
            width="100%"
            status={error ? 'error' : 'default'}
          />
        </form>
      </Tabs.Item>
    </Tabs>
  )
}

export default FormText
