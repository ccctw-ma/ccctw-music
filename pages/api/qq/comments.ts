/**
 * @Author: msc
 * @Date: 2022-06-20 22:20:29
 * @LastEditTime: 2022-06-21 15:25:00
 * @LastEditors: msc
 * @Description:
 */

import qqMusic from "qq-music-api";

export default async function handler(req, res) {
  try {
    const query = req.query;
    const id = query.id;
    const pageNo = query.pageNo || 1;
    const pageSize = 20;
    const type = query.type;
    const biztype = 1;
    console.log(id, pageNo);
    const result = await qqMusic.api("/comment", {
      id,
      pageNo,
      pageSize,
      type,
      biztype,
    });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json(e);
  }
}
