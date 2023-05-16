/**
 * @Author: msc
 * @Date: 2022-05-03 15:27:25
 * @LastEditTime: 2022-06-21 14:30:52
 * @LastEditors: msc
 * @Description:
 */

export const timeFormatter = (value) => {
  //取整
  value = ~~value;
  let minute = ~~(value / 60);
  minute = minute < 10 ? "0" + minute : String(minute);
  let second = value % 60;
  second = second < 10 ? "0" + second : String(second);
  return minute + ":" + second;
};

export const timeStampFormatter = (timeStamp) => {
  let date = new Date(timeStamp);
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  const appendZero = (num) => (parseInt(num) < 10 ? "0" + num : num);
  return year + "-" + appendZero(month) + "-" + appendZero(day);
};
