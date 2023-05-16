// Next.js API route support: https://nextjs.org/docs/api-routes/introduction


import Cookies from "cookies"

export default function handler(req, res) {

  const cookies = new Cookies(req, res);
  const name = cookies.get('name');

  console.log(cookies.get("NMTID"));
  console.log(name);
  cookies.set("age", "1000", {
    maxAge: 10000,
    httpOnly: true
  })
  // res.setHeader("set-cookie", "name=Fuck you cookie;")
  res.status(200).json({ name: 'Fuck you tony' })
}
