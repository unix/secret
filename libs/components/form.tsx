import React, { useMemo, useRef, useState } from 'react'
import { Button, Spacer, Text, Divider, Popover, Link, Grid } from '@geist-ui/react'
import { secret, apis } from '@libs/utils'
import FormLabel from './form-label'
import FormText from './form-text'
import { useRouter } from 'next/router'
import Status, { StatusNext } from './status'
import { SecretApiResult } from '@libs/utils/apis'
import Shield from '@geist-ui/react-icons/shield'
import Settings, { defaultSettings, SecretSettings } from './settings'
import NextLink from 'next/link'

const TipContent = () => (
  <Text span size={13} style={{ padding: '0 10px' }}>
    File not allowed? read{' '}
    <NextLink href="/0x01" passHref>
      <Link color>Consideration</Link>
    </NextLink>{' '}
    learn more.
  </Text>
)

const getValidateMessage = (value: string): string | null => {
  if (!value) return 'Text content cannot be empty.'
  if (value.length <= 3) return 'Less than 3 characters.'
  if (value.length >= 1000) return 'Up to 1000 characters can be sent.'
  return null
}

const Form: React.FC<unknown> = () => {
  const router = useRouter()
  const ref = useRef<StatusNext>()
  const [state, setState] = useState<string>()
  const [dirty, setDirty] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [settings, setSettings] = useState<SecretSettings>(defaultSettings)
  const [result, setResult] = useState<SecretApiResult | null>(null)

  const error = useMemo(() => {
    if (!dirty && !state) return null
    return getValidateMessage(state)
  }, [state, dirty])

  const clickHandler = async () => {
    setDirty(true)
    if (getValidateMessage(state)) return
    setLoading(true)
    ref.current.next()
    const preResult = secret.preToSecrets(state)
    ref.current.next()
    const { cipher, privateKey, nonce } = secret.toSecrets(preResult)
    ref.current.next()
    const expire = +settings.expire * 1000 * 60
    try {
      const result = await apis.createSecret({
        content: cipher,
        count: settings.count,
        expire,
      })
      ref.current.next()
      secret.cacheNonce(
        {
          nonce,
          key: privateKey,
          expire,
        },
        result.guard_id,
      )
      setResult(result)
      ref.current.over()
    } catch (err) {
      ref.current.fail()
      setLoading(false)
      setResult(null)
    }
  }

  const redirect = async () => {
    if (!result?.guard_id) return
    await router.push(`/track?q=${result.guard_id}`)
  }

  return (
    <div>
      <FormLabel title="Shared content" error={error}>
        <Text span>
          A quote, password, link, or whatever you wish to{' '}
          <Popover trigger="hover" placement="top" content={TipContent}>
            <Text span type="warning">
              share
            </Text>
          </Popover>
          .
        </Text>
      </FormLabel>
      <Status ref={ref} onClick={redirect} />
      <FormText error={error} onChange={val => setState(val)} />
      <Spacer y={2.4} />
      <Divider volume={1} y={1} />
      <Settings onClick={val => setSettings(val)} />
      <Divider volume={1} y={1} />
      <Spacer y={2} />

      <Grid.Container>
        <Grid xs={24} justify="flex-end">
          <Button
            auto
            loading={loading}
            icon={<Shield />}
            type="success-light"
            size="small"
            onClick={clickHandler}>
            Secret it
          </Button>
        </Grid>
      </Grid.Container>
    </div>
  )
}

export default Form
