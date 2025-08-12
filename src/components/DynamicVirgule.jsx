"use client";
import React, { useEffect, useState } from "react";
import Virgule from "@/components/Virgule";

export default function DynamicVirgule({ count, latestCreatedAt }) {
    const [daysAgo, setDaysAgo] = useState(null);
    useEffect(() => {
        if (latestCreatedAt) {
            const createdAt = new Date(latestCreatedAt);
            const now = new Date();
            const diff = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
            setDaysAgo(diff);
        }
    }, [latestCreatedAt]);
    const text = `共索引 ${count} 篇文章${
        count > 0 && daysAgo !== null
            ? `，最近更新于${daysAgo}天前`
            : ''
    }`;
    return <Virgule text={text} timeout={1200} />;
}
