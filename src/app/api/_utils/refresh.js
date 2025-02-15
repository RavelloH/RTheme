'use server';

import { revalidatePath } from 'next/cache';

export async function refreshPosts() {
    // 索引页面刷新
    revalidatePath('/posts');
    revalidatePath('/tags');
    revalidatePath('/categories');

    // feed刷新
    revalidatePath('/feed');

    // 重建sitemap
    revalidatePath('/sitemap.xml');
}
