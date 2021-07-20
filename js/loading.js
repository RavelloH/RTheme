//图片懒加载
var aImages = new Array();
var aImages_t = new Array();
var itick = 0;

function getaImages() {
    var temp = document.getElementsByTagName('img').length;
    var iobj;
    for (var i = 0; i < temp; i++) {
        iobj = document.getElementsByTagName('img')[i];
        if (iobj.dataset) {
            aImages_t[i] = iobj.dataset.imgurl;
        } else {
            aImages_t[i] = iobj.getAttribute("data-imgurl");
        }
        if (typeof (aImages_t[i]) != "undefined") {
            aImages[itick] = iobj;
            itick++;
        }
    }
}
//getBoundingClientRect
function loadImg(arr) {
    for (var i = 0, len = arr.length; i < len; i++) {
        if (arr[i].getBoundingClientRect().top < document.documentElement.clientHeight && !arr[i].isLoad) {
            arr[i].isLoad = true; //图片显示标志位
            (function (i) {
                setTimeout(function () {
                    if (arr[i].dataset) { //兼容不支持data的浏览器
                        aftLoadImg(arr[i], arr[i].dataset.imgurl);
                    } else {
                        aftLoadImg(arr[i], arr[i].getAttribute("data-imgurl"));
                    }
                    arr[i].style.cssText = "opacity:1;";
                }, 500)
            })(i);
        }
    }
}

function aftLoadImg(obj, url) {
    var oImg = new Image();
    oImg.onload = function () {
        obj.src = oImg.src; //下载完成后将该图片赋给目标obj目标对象
    }
    oImg.src = url; //oImg对象先下载该图像
}
window.onbeforeunload = function (e) {
    document.getElementById("text").id = "active";
}