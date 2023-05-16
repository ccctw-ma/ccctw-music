/**
 * @Author: msc
 * @Date: 2022-06-20 21:45:32
 * @LastEditTime: 2022-06-20 21:47:36
 * @LastEditors: msc
 * @Description:
 */

import qqMusic from "qq-music-api";

export default async function handler(req, res) {
  try {
    const data = await qqMusic.api("/user/getCookie");
    console.log(data);
    res.status(200).json(data);
  } catch (e) {}
}
