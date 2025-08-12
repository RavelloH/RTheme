"use client";
import React, { useEffect, useState } from "react";
import Virgule from "@/components/Virgule";

export default function DynamicVirgule({ posts }) {
    const [daysAgo, setDaysAgo] = useState(null);
    useEffect(() => {
        if (posts.length > 0) {
            const createdAt = new Date(posts[0].createdAt);
            const now = new Date();
            const diff = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
            setDaysAgo(diff);
        }
    }, [posts]);
    const text = `共索引 ${posts.length} 篇文章${
        posts.length > 0 && daysAgo !== null
            ? `，最近更新于${daysAgo}天前`
            : ''
    }`;
    return <Virgule text={text} timeout={1200} />;
}
