function formatDateWithTimeZone(dateStr, timeZone) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');

    const offset = new Date().getTimezoneOffset() - timeZone * 60;
    const newDate = new Date(date.getTime() + offset * 60 * 1000);

    const newHour = newDate.getHours().toString().padStart(2, '0');
    const newMinute = newDate.getMinutes().toString().padStart(2, '0');

    return `${year}年${month}月${day}日 ${newHour}点${newMinute}分${second}秒`;
}

export default formatDateWithTimeZone;
