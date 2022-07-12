// 菜单
const menuToggle = document.querySelector(".toggle");
const showcase = document.querySelector(".showcase");
const shade = document.querySelector(".shade");

menuToggle.addEventListener("click", () => {
  menuToggle.classList.toggle("active");
  showcase.classList.toggle("active");
  shade.classList.toggle("active");
});

// 点击.shade时，关闭.showcase
shade.onclick = function () {
  menuToggle.classList.toggle("active");
  showcase.classList.toggle("active");
  shade.classList.toggle("active");
}

// Copyright时间更新
Date.prototype.format = function (fmt) {
  var o = {};
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(
      RegExp.$1,
      (this.getFullYear() + "").substr(4 - RegExp.$1.length)
    );
  }
  return fmt;
};
var now = new Date();
var nowStr = now.format("yyyy");
document.getElementById("year").innerHTML = new Date().format("yyyy");

// 页面退出时，id更改为active
window.onbeforeunload = function () {
  for (var j = 0; j < 5; j++) {
    document.getElementById("text").id = "active";
  }
  var spans = document.getElementsByTagName("span");
  for (var i = 0; i < spans.length; i++) {
    spans[i].id = "active";
  }
};

// listprogramload动画
// 倒序排列--i：排序后的序号
for (
  let j = document.getElementsByClassName("listprogram").length;
  j > 0;
  j--
) {
  document
    .getElementsByClassName("listprogram")
    [j - 1].setAttribute("style", "--i: " + j);
}

// listprogram => listprogramload
function onload() {
  for (
    let i = 0;
    i < document.getElementsByClassName("listprogram").length;
    i++
  ) {
    document
      .getElementsByClassName("listprogram")
      [i].classList.add("listprogramonload");
  }
}

// 当点击图片时，创建一个铺满整个屏幕的div，并将图片放入
function consoleImgSrc() {
  var img = document.getElementsByTagName("img");
  for (var i = 0; i < img.length; i++) {
    img[i].onclick = function () {
      var div = document.createElement("div");
      var img = document.createElement("img");
      img.className = "img-fullscreen-out";
      img.src = this.src;
      document.body.appendChild(div);
      document.body.appendChild(img);
      setTimeout(function () {
      img.className = "img-fullscreen";
      div.className = "img-show";
      }, 200);

      img.onclick  = function () {
        img.className = "img-fullscreen-out";
        div.className = "img-show-out";
        setTimeout(function () {
          document.body.removeChild(div);
          document.body.removeChild(img);
        },500)
      };
      div.onclick  = function () {
        img.className = "img-fullscreen-out";
        div.className = "img-show-out";
        setTimeout(function () {
          document.body.removeChild(div);
          document.body.removeChild(img);
        },500)
        }
      }
      
      };
    };
consoleImgSrc();

var CURSOR;
Math.lerp = (a, b, n) => (1 - n) * a + n * b;
const getStyle = (el, attr) => {
    try {
        return window.getComputedStyle
            ? window.getComputedStyle(el)[attr]
            : el.currentStyle[attr];
    } catch (e) {}
    return "";
};
class Cursor {
    constructor() {
        this.pos = {curr: null, prev: null};
        this.pt = [];
        this.create();
        this.init();
        this.render();
    }

    move(left, top) {
        this.cursor.style["left"] = `${left}px`;
        this.cursor.style["top"] = `${top}px`;
    }

    create() {
        if (!this.cursor) {
            this.cursor = document.createElement("div");
            this.cursor.id = "cursor";
            this.cursor.classList.add("hidden");
            document.body.append(this.cursor);
        }

        var el = document.getElementsByTagName('*');
        for (let i = 0; i < el.length; i++)
            if (getStyle(el[i], "cursor") == "pointer")
                this.pt.push(el[i].outerHTML);

        document.body.appendChild((this.scr = document.createElement("style")));
        this.scr.innerHTML = `* {cursor: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8' width='8px' height='8px'><circle cx='4' cy='4' r='4' fill='white' opacity='.5'/></svg>") 4 4, auto}`;
    }

    refresh() {
        this.scr.remove();
        this.cursor.classList.remove("hover");
        this.cursor.classList.remove("active");
        this.pos = {curr: null, prev: null};
        this.pt = [];

        this.create();
        this.init();
        this.render();
    }

    init() {
        document.onmouseover  = e => this.pt.includes(e.target.outerHTML) && this.cursor.classList.add("hover");
        document.onmouseout   = e => this.pt.includes(e.target.outerHTML) && this.cursor.classList.remove("hover");
        document.onmousemove  = e => {(this.pos.curr == null) && this.move(e.clientX - 8, e.clientY - 8); this.pos.curr = {x: e.clientX - 8, y: e.clientY - 8}; this.cursor.classList.remove("hidden");};
        document.onmouseenter = e => this.cursor.classList.remove("hidden");
        document.onmouseleave = e => this.cursor.classList.add("hidden");
        document.onmousedown  = e => this.cursor.classList.add("active");
        document.onmouseup    = e => this.cursor.classList.remove("active");
    }

    render() {
        if (this.pos.prev) {
            this.pos.prev.x = Math.lerp(this.pos.prev.x, this.pos.curr.x, 0.15);
            this.pos.prev.y = Math.lerp(this.pos.prev.y, this.pos.curr.y, 0.15);
            this.move(this.pos.prev.x, this.pos.prev.y);
        } else {
            this.pos.prev = this.pos.curr;
        }
        requestAnimationFrame(() => this.render());
    }
}

(() => {
    CURSOR = new Cursor();
})();
