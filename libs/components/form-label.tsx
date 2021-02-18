import React, { useMemo } from 'react'
import { Dot, Grid, Spacer, Text } from '@geist-ui/react'

export type FormLabelProps = {
  title: string
  desc?: string
  error?: string
}

const FormLabel: React.FC<React.PropsWithChildren<FormLabelProps>> = ({
  title,
  children,
  desc,
  error,
}) => {
  const child = desc || children
  const dotType = useMemo(() => (error ? 'error' : 'secondary'), [error])

  const errorContent = useMemo(() => {
    return (
      <>
        <Grid xs={24}>
          <Spacer y={0.1} />
        </Grid>
        <Grid xs={24}>
          <Text span type="error" size={12}>
            {error}
          </Text>
        </Grid>
      </>
    )
  }, [error])

  return (
    <Grid.Container>
      <Grid xs={24}>
        <Dot type={dotType} />
        <Text span size={13}>
          {title}
        </Text>
      </Grid>

      {child && (
        <>
          <Grid xs={24}>
            <Spacer y={0.25} />
          </Grid>
          <Grid xs={24}>
            <Text span type="secondary" size={12}>
              {child}
            </Text>
          </Grid>
        </>
      )}

      {errorContent}
      {child && (
        <Grid xs={24}>
          <Spacer y={0.75} />
        </Grid>
      )}
    </Grid.Container>
  )
}

export default FormLabel
