import React from 'react'
import { Grid, Text } from '@geist-ui/react'

export type TitleProps = {
  title: string
  desc?: string
}

const Title: React.FC<TitleProps> = ({ title, desc }) => {
  return (
    <div className="center">
      <Grid.Container>
        <Grid xs={24} justify="center" alignItems="center">
          <Text p size={22}>
            {title}
          </Text>
        </Grid>
        {desc && (
          <Grid xs={24} justify="center" alignItems="center">
            <Text span size={12}>
              {desc}
            </Text>
          </Grid>
        )}
      </Grid.Container>
      <style jsx>{`
        .center {
          text-align: center;
          height: 350px;
          display: flex;
          justify-content: center;
          flex-direction: column;
          margin-bottom: 100px;
        }
      `}</style>
    </div>
  )
}

export default Title
