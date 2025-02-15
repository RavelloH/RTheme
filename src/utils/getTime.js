export default function getTime(formats, startTime = '') {
    var yyyy, MM, DD, hh, mm, ss;
    var today = new Date();
    if (startTime == '') {
        yyyy = today.getFullYear();
        MM = String(today.getMonth() + 1).padStart(2, '0');
        DD = String(today.getDate()).padStart(2, '0');
        hh = String(today.getHours()).padStart(2, '0');
        mm = String(today.getMinutes()).padStart(2, '0');
        ss = String(today.getSeconds()).padStart(2, '0');
        return formats
            .replace(/yyyy/g, yyyy)
            .replace(/MM/g, MM)
            .replace(/DD/g, DD)
            .replace(/hh/g, hh)
            .replace(/mm/g, mm)
            .replace(/ss/g, ss);
    } else {
        var T, M, A, B, C, D, a, b, c;
        var lastDay = new Date(startTime);
        T = today.getTime() - lastDay.getTime();
        M = 24 * 60 * 60 * 1000;
        a = T / M;
        A = Math.floor(a);
        b = (a - A) * 24;
        B = Math.floor(b);
        c = (b - B) * 60;
        C = Math.floor((b - B) * 60);
        D = Math.floor((c - C) * 60);
        return formats.replace(/DD/g, A).replace(/hh/g, B).replace(/mm/g, C).replace(/ss/g, D);
    }
}
