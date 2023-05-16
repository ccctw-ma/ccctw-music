/**
 * @Author: msc
 * @Date: 2022-06-19 15:13:54
 * @LastEditTime: 2022-06-19 15:23:28
 * @LastEditors: msc
 * @Description:
 */

import neteaseRequest from "../../../util/neteaseRequest";

export default async function handler(req, res) {
  try {
    const query = req.query;
    if (!query.id) {
      throw "专辑的id 呢";
    }
    const body = await neteaseRequest(
      "POST",
      `https://music.163.com/weapi/v1/album/${query.id}`,
      {},
      {
        crypto: "weapi",
        cookie: query.cookie,
        proxy: query.proxy,
        realIP: query.realIP,
      }
    );
    if (body.status === 200) {
      res.status(200).json(body.body);
    } else {
      throw body;
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ e });
  }
}
