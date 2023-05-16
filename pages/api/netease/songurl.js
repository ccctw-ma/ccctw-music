/**
 * @Author: msc
 * @Date: 2022-06-17 00:48:40
 * @LastEditTime: 2022-06-17 01:03:26
 * @LastEditors: msc
 * @Description:
 */

// 歌曲链接
import neteaseRequest from "../../../util/neteaseRequest";
export default async function handler(req, res) {
  try {
    const query = req.query;
    
    // query.cookie.os = "pc";
    const data = {
      ids: "[" + query.id + "]",
      br: parseInt(query.br || 999000),
    };
    // console.log(data);
    const body = await neteaseRequest(
      "POST",
      `https://interface3.music.163.com/eapi/song/enhance/player/url`,
      data,
      {
        crypto: "eapi",
        cookie: query.cookie,
        proxy: query.proxy,
        realIP: query.realIP,
        url: "/api/song/enhance/player/url",
      }
    );
    if(body.status === 200){
       res.status(200).json(body.body); 
    }else{
        throw body.status;
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ e });
  }
}
