'use client';

export default function GlobalError({ error, reset }) {
    return (
        <html>
            <head>
                <title>FATAL ERROR</title>
            </head>
            <body>
                <h2>FATAL ERROR</h2>
                <h3>致命错误 - RTheme基础框架加载失败</h3>
                <h4>错误信息：{error.message}</h4>
                <h4>请尝试重载此页面，以重新加载RTheme框架</h4>
                <button onClick={() => reset()}>重置此页面</button>
            </body>
        </html>
    );
}
