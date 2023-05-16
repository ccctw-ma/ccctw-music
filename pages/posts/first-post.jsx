/*
 * @Author: msc
 * @Date: 2022-04-12 22:02:01
 * @LastEditTime: 2022-04-12 22:19:39
 * @LastEditors: msc
 * @Description:
 */

import Head from 'next/head'
import Link from 'next/link'
import Layout from '../../components/layout'

export default function FirstPost() {
  return (
    <Layout>
      <Head>
        <title>First Post</title>
      </Head>
      <h1>First Post</h1>
      <h2>
        <Link href="/">
          <a>Back to home</a>
        </Link>
      </h2>
    </Layout>
  )
}