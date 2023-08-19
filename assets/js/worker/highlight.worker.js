importScripts('../lib/highlight.min.js');
function HTMLEncode(str) {
    var s = '';
    if (str.length == 0) return '';
    s = str.replace(/&/g, '&amp;');
    s = s.replace(/</g, '&lt;');
    s = s.replace(/>/g, '&gt;');
    s = s.replace(/ /g, '&nbsp;');
    s = s.replace(/\'/g, '&#39;');
    s = s.replace(/\"/g, '&quot;');
    s = s.replace(/\n/g, '<br/>');
    return s;
}

function HTMLDecode(str) {
    var s = '';
    if (str.length == 0) return '';
    s = str.replace(/&amp;/g, '&');
    s = s.replace(/&lt;/g, '<');
    s = s.replace(/&gt;/g, '>');
    s = s.replace(/&nbsp;/g, ' ');
    s = s.replace(/&#39;/g, "'");
    s = s.replace(/&quot;/g, '"');
    s = s.replace(/<br\/>/g, '\n');
    return s;
}

onmessage = (event) => {
    if (/<span(([\s\S])*?)<\/span>/.test(event.data)) {
        var originCode = event.data
            .split('\n')
            .map((e) => ['', ...e.split('')].reduce((p, n) => (!p && n === ' ' ? '' : p + n)))
            .map((e) => e.slice(6, -7))
            .join('\n');
        var result = self.hljs.highlightAuto(HTMLDecode(HTMLEncode(HTMLDecode(originCode))));
        var processedCode = result.value
            .split('\n')
            .map((e) => {
                if (e.includes('<span')) {
                    return '<span>' + e + '</span>';
                } else {
                    return '<span>' + e.replace(/<br\/>/g, '\n').replace(/\n/g, '') + '</span>';
                }
            })
            .join('\n');
        postMessage(processedCode.substring(0, processedCode.length - 13));
    } else {
        var result = self.hljs.highlightAuto(HTMLDecode(event.data));
        postMessage(result.value);
    }
};
