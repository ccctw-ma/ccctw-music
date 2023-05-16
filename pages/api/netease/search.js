/**
 * @Author: msc
 * @Date: 2022-06-16 22:16:44
 * @LastEditTime: 2022-06-16 23:52:34
 * @LastEditors: msc
 * @Description:
 */

import neteaseRequest from "../../../util/neteaseRequest";

export default async function handler(req, res) {
  try {
    const cookie = req.headers.cookie;
    const cookies = cookie.split(";").reduce((pre, cur) => {
      let [key, value] = cur.trim().split("=");
      pre[key] = value;
      return pre;
    }, {});
    const query = req.query;
    const data = {
      s: query.keywords,
      type: query.type || 1,
      limit: query.limit || 50,
      offset: query.offset || 0,
    };

    // console.log(data);
    const body = await neteaseRequest(
      "POST",
      `https://music.163.com/weapi/search/get`,
      data,
      {
        crypto: "weapi",
        cookie: query.cookie,
        proxy: query.proxy,
        realIP: query.realIP,
      }
    );
    // console.log(body);

    res.status(200).json(body);
  } catch (e) {
    res.status(500).json({
      message: "出现错误",
      detail: e,
    });
  }
}
