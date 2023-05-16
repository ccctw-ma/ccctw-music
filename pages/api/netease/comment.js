/**
 * @Author: msc
 * @Date: 2022-06-19 17:29:31
 * @LastEditTime: 2022-06-19 22:49:26
 * @LastEditors: msc
 * @Description:
 */

import neteaseRequest from "../../../util/neteaseRequest";

export default async function handler(req, res) {
  try {
    const query = req.query;
    const cid = query.id;
    const pageNo = Number(query.pageNo) || 1;
    const type = "R_SO_4_";
    const threadId = type + cid;
    const pageSize = 20;
    let cursor = 'normalHot#' + (pageNo - 1) * pageSize;
    const data = {
      threadId,
      pageNo,
      showInner: true,
      pageSize,
      cursor,
      sortType: 2,
    };
    // console.log(data);
    const commentData = await neteaseRequest(
      "POST",
      `https://music.163.com/api/v2/resource/comments`,
      data,
      {
        crypto: "eapi",
        cookie: query.cookie,
        proxy: query.proxy,
        realIP: query.realIP,
        url: "/api/v2/resource/comments",
      }
    );
    if (commentData.status === 200) {
    //   console.log(commentData);
      res.status(200).json(commentData.body);
    } else {
      console.log(commentData);
      throw commentData;
    }
  } catch (e) {
    res.status(500).json(e);
  }
}
