import { Layout, Form, Title, Footer } from '@libs/components'
import React from 'react'

const Go: React.FC<unknown> = () => {
  return (
    <Layout>
      <Title
        title="Ready to Secret"
        desc="Fill in any text you like, then share it with your friends."
      />
      <Form />
      <Footer />
    </Layout>
  )
}

export default Go
