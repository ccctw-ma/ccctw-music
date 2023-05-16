/**
 * @Author: msc
 * @Date: 2022-04-15 20:01:29
 * @LastEditTime: 2022-04-15 20:01:30
 * @LastEditors: msc
 * @Description:
 */
import Layout from "../../components/layout";

export default function Post({ data }) {
  return <Layout>{data}</Layout>;
}

export async function getStaticPaths() {
  return {
    paths: [
      {
        params: {
          id: "1",
        },
      },
      {
        params: {
          id: "2",
        },
      },
      {
        params: {
          id: "3",
        },
      },
    ],
    fallback: true,
  };
}

export async function getStaticProps({ params }) {
  const data = `Hello ${params.id}`;
  return {
    props: {
      data,
    },
  };
}
