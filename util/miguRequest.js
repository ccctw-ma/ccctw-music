/**
 * @Author: msc
 * @Date: 2022-05-03 11:59:11
 * @LastEditTime: 2022-05-03 12:00:21
 * @LastEditors: msc
 * @Description: 
 */

import axios from "axios";
const requestBack = async (url, method = "get", options = {}, opts = {}) => {
    try {
        const { dataType } = opts;
        options.url = url;
        options.method = method;
        options.headers = options.headers ?? {};
        options.headers.referer = options.headers?.referer ?? 'http://m.music.migu.cn/v3';
        options.xsrfCookieName = 'XSRF-TOKEN';
        options.withCredentials = true;
        const res = await axios(options);
        if (dataType === "raw") return res.data
        if (typeof res.data === "string") {
            res.data = res.data.replace(/callback\(|MusicJsonCallback\(|jsonCallback\(|\)$/g, '');
            return JSON.parse(res.data);
        }
        return res.data
    } catch (err) {
        if (err.message === 'Request failed with status code 503') {
            console.log('retry');
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(request(url, method, options));
                }, 300);
            });
        }
        return {};
    }
}

export default requestBack;