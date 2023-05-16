/**
 * @Author: msc
 * @Date: 2022-06-09 22:08:48
 * @LastEditTime: 2022-06-09 23:43:46
 * @LastEditors: msc
 * @Description: 
 */
import Cookies from "cookies"

export default function handler(req, res) {

  const cookies = new Cookies(req, res);
  const name = cookies.get('name');

  console.log(cookies.get("NMTID"));
  console.log(name);
  cookies.set("test", "1000", {
    maxAge: 60000,
    httpOnly: true,
    path:'/api/test',
  })
  // res.setHeader("set-cookie", "name=Fuck you cookie;")
  res.status(200).json({ name: 'Fuck you test' })
}

