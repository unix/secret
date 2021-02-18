import React, { useEffect, useState } from 'react'
import { Button, Slider, Text, Grid, Dot, Divider, Popover } from '@geist-ui/react'
import FormLabel from '@libs/components/form-label'
import SettingsIcon from '@geist-ui/react-icons/settings'

export type SecretSettings = {
  count: number
  expire: number
}

export const defaultSettings: SecretSettings = {
  count: 1,
  expire: 3,
}

export type SettingsProps = {
  onClick: (settings: SecretSettings) => void
}

const SettingsBox: React.FC<React.PropsWithChildren<unknown>> = ({
  children,
  ...props
}) => {
  return (
    <Grid.Container className="settings" {...props}>
      {children}
      <style jsx>{`
        :global(.settings.item) {
          padding: 10px 10px;
        }
      `}</style>
    </Grid.Container>
  )
}

const Settings: React.FC<SettingsProps> = ({ onClick }) => {
  const [count, setCount] = useState<number>(defaultSettings.count)
  const [expire, setExpire] = useState<number>(defaultSettings.expire)
  const [visible, setVisible] = useState<boolean>(false)

  useEffect(() => {
    onClick && onClick({ count, expire })
  }, [count, expire])

  if (!visible) {
    return (
      <SettingsBox>
        <Button
          icon={<SettingsIcon />}
          auto
          size="small"
          onClick={() => setVisible(true)}>
          settings
        </Button>
      </SettingsBox>
    )
  }

  return (
    <SettingsBox>
      <FormLabel title="Create multiple links">
        <Text span>
          Generate multiple trackable links, each with the same readable count of 1.
        </Text>
      </FormLabel>
      <Grid xs={24} style={{ padding: '0 10px' }}>
        <Slider
          step={1}
          max={10}
          min={1}
          initialValue={defaultSettings.count}
          showMarkers
          value={count}
          onChange={val => setCount(val)}
        />
      </Grid>
      <Grid xs={24} style={{ display: 'block' }}>
        <Divider volume={1} y={3.5} style={{ width: '10%' }} />
      </Grid>
      <FormLabel title="Specify expiration time">
        <Text span>
          The secret will be destroyed automatically, up to a maximum of 60 minutes.
        </Text>
      </FormLabel>

      <Grid xs={24} style={{ padding: '0 10px' }}>
        <Slider
          step={1}
          max={60}
          min={3}
          initialValue={defaultSettings.expire}
          showMarkers
          value={expire}
          onChange={val => setExpire(val)}
        />
      </Grid>
      <style jsx>{`
        :global(.control.slider) {
          width: 80%;
          font-size: 50px;
        }
      `}</style>
    </SettingsBox>
  )
}

export default Settings
