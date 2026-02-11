<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:media="http://search.yahoo.com/mrss/"
>
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>
          <xsl:value-of select="rss/channel/title" />
          <xsl:text> / RSS</xsl:text>
        </title>
        <style>
          :root {
            --bg: #111111;
            --fg: #ffffff;
            --line: rgba(255, 255, 255, 0.26);
            --line-soft: rgba(255, 255, 255, 0.1);
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: var(--bg);
            color: var(--fg);
            font-family: "Helvetica Neue", "Akzidenz-Grotesk", "Segoe UI",
              "Noto Sans SC", sans-serif;
          }

          a {
            color: inherit;
            text-decoration: none;
          }

          .shell {
            width: min(1180px, calc(100vw - 3rem));
            margin: 2rem auto 3rem;
          }

          .masthead {
            border-top: 2px solid var(--fg);
            border-bottom: 1px solid var(--line);
            padding: 1.5rem 0 1.75rem;
            display: grid;
            gap: 1rem;
          }

          .kicker {
            font-size: 0.72rem;
            letter-spacing: 0.34em;
            text-transform: uppercase;
            opacity: 0.78;
          }

          .title {
            margin: 0;
            font-size: clamp(2rem, 6vw, 4.8rem);
            line-height: 0.92;
            letter-spacing: -0.03em;
            text-transform: uppercase;
            max-width: 18ch;
          }

          .deck {
            margin: 0;
            max-width: 72ch;
            font-size: 0.98rem;
            line-height: 1.68;
            opacity: 0.86;
          }

          .feed-url {
            margin: 0;
            font-family: "IBM Plex Mono", "SFMono-Regular", Consolas,
              "Liberation Mono", monospace;
            font-size: 0.74rem;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            opacity: 0.66;
            overflow-wrap: anywhere;
          }

          .stream {
            column-count: 2;
            column-gap: 1.4rem;
            column-rule: 1px solid var(--line-soft);
            border-top: 1px solid var(--line);
            padding-top: 1.1rem;
          }

          .card {
            display: inline-block;
            width: 100%;
            padding: 0 0 1.15rem;
            margin: 0 0 1.15rem;
            border-bottom: 1px solid var(--line-soft);
            break-inside: avoid;
          }

          .meta {
            display: flex;
            gap: 0.75rem;
            margin-bottom: 0.55rem;
            font-size: 0.68rem;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            opacity: 0.62;
          }

          .headline {
            margin: 0;
            font-size: clamp(1.05rem, 2.1vw, 1.5rem);
            line-height: 1.22;
            letter-spacing: -0.01em;
            text-transform: uppercase;
          }

          .description {
            margin: 0.9rem 0 0;
            width: 100%;
            max-width: none;
            font-size: 0.9rem;
            line-height: 1.72;
            opacity: 0.86;
          }

          .body-preview {
            margin: 0.55rem 0 0;
            width: 100%;
            max-width: none;
            font-size: 0.83rem;
            line-height: 1.72;
            letter-spacing: 0.015em;
            opacity: 0.72;
          }

          .thumb {
            margin: 0.9rem 0 0;
            border: 1px solid var(--line-soft);
            overflow: hidden;
            aspect-ratio: 16 / 9;
            background: rgba(255, 255, 255, 0.03);
          }

          .thumb img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: grayscale(1) contrast(1.08);
            transition: filter 0.24s ease;
          }

          .card:hover .thumb img {
            filter: none;
          }

          .read-more {
            margin-top: 0.95rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.42rem 0.82rem;
            border: 1px solid var(--line);
            font-size: 0.68rem;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            line-height: 1;
            transition: background-color 0.2s ease, color 0.2s ease;
          }

          .read-more:hover {
            background: var(--fg);
            color: var(--bg);
          }

          .tail {
            margin-top: 2rem;
            border-top: 1px solid var(--line);
            padding-top: 0.7rem;
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            font-size: 0.7rem;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            opacity: 0.62;
          }

          @media (max-width: 920px) {
            .stream {
              column-count: 1;
              column-gap: 0;
              column-rule: none;
            }

            .shell {
              width: min(1180px, calc(100vw - 1.8rem));
              margin-top: 1.2rem;
            }

            .masthead {
              padding-top: 1.1rem;
            }
          }
        </style>
      </head>
      <body>
        <main class="shell">
          <header class="masthead">
            <p class="kicker">NeutralPress Feed System</p>
            <h1 class="title">
              <xsl:value-of select="rss/channel/title" />
            </h1>
            <p class="deck">
              <xsl:value-of select="rss/channel/description" />
            </p>
            <p class="feed-url">
              <xsl:text>Feed URL: </xsl:text>
              <xsl:choose>
                <xsl:when test="string-length(normalize-space(rss/channel/atom:link[@rel='self']/@href)) &gt; 0">
                  <xsl:value-of select="rss/channel/atom:link[@rel='self']/@href" />
                </xsl:when>
                <xsl:when test="substring(rss/channel/link, string-length(rss/channel/link), 1) = '/'">
                  <xsl:value-of select="concat(rss/channel/link, 'feed.xml')" />
                </xsl:when>
                <xsl:otherwise>
                  <xsl:value-of select="concat(rss/channel/link, '/feed.xml')" />
                </xsl:otherwise>
              </xsl:choose>
            </p>
          </header>

          <section class="stream">
            <xsl:for-each select="rss/channel/item">
              <article class="card">
                <div class="meta">
                  <span>
                    <xsl:value-of select="substring(pubDate, 1, 16)" />
                  </span>
                  <span>#<xsl:value-of select="position()" /></span>
                </div>
                <h2 class="headline">
                  <a href="{link}" target="_blank" rel="noopener noreferrer">
                    <xsl:value-of select="title" />
                  </a>
                </h2>
                <xsl:variable name="imageUrl">
                  <xsl:choose>
                    <xsl:when test="string-length(normalize-space(enclosure/@url)) &gt; 0 and starts-with(normalize-space(enclosure/@type), 'image/')">
                      <xsl:value-of select="enclosure/@url" />
                    </xsl:when>
                    <xsl:otherwise />
                  </xsl:choose>
                </xsl:variable>
                <xsl:if test="string-length(normalize-space($imageUrl)) &gt; 0">
                  <figure class="thumb">
                    <img src="{$imageUrl}" alt="" loading="lazy" />
                  </figure>
                </xsl:if>
                <xsl:if test="string-length(normalize-space(description)) &gt; 0">
                  <p class="description">
                    <xsl:value-of select="substring(normalize-space(description), 1, 180)" />
                    <xsl:if test="string-length(normalize-space(description)) &gt; 180">
                      <xsl:text>...</xsl:text>
                    </xsl:if>
                  </p>
                </xsl:if>
                <xsl:variable name="bodyPreview">
                  <xsl:choose>
                    <xsl:when test="string-length(normalize-space(contentPreview)) &gt; 0">
                      <xsl:value-of select="normalize-space(contentPreview)" />
                    </xsl:when>
                    <xsl:when test="string-length(normalize-space(content:encoded)) &gt; 0">
                      <xsl:value-of select="normalize-space(content:encoded)" />
                    </xsl:when>
                    <xsl:otherwise />
                  </xsl:choose>
                </xsl:variable>
                <xsl:if test="string-length(normalize-space($bodyPreview)) &gt; 0">
                  <p class="body-preview">
                    <xsl:text>正文预览： </xsl:text>
                    <xsl:value-of select="substring(normalize-space($bodyPreview), 1, 240)" />
                    <xsl:if test="string-length(normalize-space($bodyPreview)) &gt; 240">
                      <xsl:text>...</xsl:text>
                    </xsl:if>
                  </p>
                </xsl:if>
                <a class="read-more" href="{link}" target="_blank" rel="noopener noreferrer">阅读全文</a>
              </article>
            </xsl:for-each>
          </section>

          <footer class="tail">
            <span>Open in any RSS reader for structured XML view</span>
            <span>
              <xsl:text>Total Items: </xsl:text>
              <xsl:value-of select="count(rss/channel/item)" />
            </span>
          </footer>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
