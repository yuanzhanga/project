import dayjs from "dayjs";
export default function (date) {
    return dayjs(date).format("M月DD日"); // 获取当前时间并格式化
}