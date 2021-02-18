import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Grid, Loading, Modal, useModal, Text, useTheme } from '@geist-ui/react'
import GitPullRequest from '@geist-ui/react-icons/gitPullRequest'
import Lambda from '@geist-ui/react-icons/lambda'
import UploadCloud from '@geist-ui/react-icons/uploadCloud'
import Package from '@geist-ui/react-icons/package'
import { useDelay } from '@libs/hooks'

export type StatusProps = {
  onClick?: () => void
}
export type StatusItemProps = {
  icon: typeof GitPullRequest
  index: number
  step: number
}

export type StatusNext = {
  next: () => void
  over: () => void
  fail: () => void
}

const StatusItem: React.FC<React.PropsWithChildren<StatusItemProps>> = ({
  icon,
  index,
  step,
  children,
}) => {
  const theme = useTheme()
  const Component = icon
  const inProgress = step === index
  const isActive = step > index
  const color = useMemo(
    () => (isActive ? theme.palette.success : theme.palette.foreground),
    [isActive, theme.palette],
  )

  return (
    <>
      <Grid xs={1} />
      <Grid xs={22} alignItems="center" justify="flex-start">
        <div className="loadingBox">
          {inProgress ? <Loading /> : <Component size={15} color={color} />}
        </div>
        <Text size={13} span type={isActive ? 'success' : 'secondary'}>
          {children}
        </Text>
        <style jsx>{`
          .loadingBox {
            width: 30px;
            height: 20px;
            display: inline-flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
          }
        `}</style>
      </Grid>
      <Grid xs={1} />
    </>
  )
}

const getCurrentTime = (times: number[], index: number): JSX.Element => {
  const current = times[index]
  const last = times[index - 1]
  if (Number.isNaN(+current) || Number.isNaN(+last)) return null
  const t = Math.ceil(+current - last)
  return (
    <Text span type="secondary">
      [{t === 0 ? 1 : t}ms]
    </Text>
  )
}

const Status = forwardRef<StatusNext, React.PropsWithChildren<StatusProps>>(
  ({ onClick }, ref) => {
    const { setVisible, bindings } = useModal()
    const { setDelay250ms } = useDelay(250)
    const [error, setError] = useState<boolean>(false)
    const [state, setState] = useState<number>(0)
    const [times, setTimes] = useState<number[]>([])

    const statusRef = useRef<StatusNext>({
      next: () => {
        setTimes(last => last.concat([window.performance.now()]))
        setState(last => last + 1)
      },
      over: () => {
        setTimes(last => last.concat([window.performance.now()]))
        setState(100)
      },
      fail: () => {
        setError(true)
        setState(3)
      },
    })
    useImperativeHandle(ref, () => statusRef.current, [])

    const clickHandler = () => {
      if (error) {
        setVisible(false)
        setDelay250ms(() => {
          setError(false)
          setTimes([])
          setState(0)
        })
        return
      }

      setVisible(false)
      setDelay250ms(() => onClick && onClick(), 0)
    }

    useEffect(() => {
      setVisible(state > 0)
    }, [state])

    return (
      <>
        <Modal {...bindings} disableBackdropClick>
          <Modal.Subtitle>Console</Modal.Subtitle>
          <Modal.Content>
            <Grid.Container gap={1}>
              <StatusItem icon={GitPullRequest} index={1} step={state}>
                Serialized text and keys {getCurrentTime(times, 1)}
              </StatusItem>
              <StatusItem icon={Lambda} index={2} step={state}>
                Encrypt text to create structured data {getCurrentTime(times, 2)}
              </StatusItem>
              <StatusItem icon={UploadCloud} index={3} step={state}>
                {error ? (
                  <Text span type="error">
                    Create consumable links and policies [Failed]
                  </Text>
                ) : (
                  <>Create consumable links and policies {getCurrentTime(times, 3)}</>
                )}
              </StatusItem>
              <StatusItem icon={Package} index={4} step={state}>
                Validation data and traceability {getCurrentTime(times, 4)}
              </StatusItem>
            </Grid.Container>
          </Modal.Content>
          <Modal.Action
            passive={error}
            loading={state < 5 && !error}
            onClick={clickHandler}>
            {error ? 'wait and try again' : 'Completed, Check it'}
          </Modal.Action>
        </Modal>
      </>
    )
  },
)

export default Status
