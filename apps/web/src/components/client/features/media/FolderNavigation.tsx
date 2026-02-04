"use client";

import { useCallback, useEffect, useState } from "react";

import { ensureUserHomeFolder } from "@/actions/media";
import type { BreadcrumbItem, FolderItem } from "@/lib/client/folder-utils";
import {
  getAccessibleFolders,
  getFolderBreadcrumb,
} from "@/lib/client/folder-utils";

export function useFolderNavigation({
  accessToken,
  userRole,
  userUid,
}: {
  accessToken: string;
  userRole: string;
  userUid: number;
}) {
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [breadcrumbItems, setBreadcrumbItems] = useState<BreadcrumbItem[]>([
    { id: null, name: "全部" },
  ]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [publicRootId, setPublicRootId] = useState<number | null>(null);

  // 加载文件夹列表
  const loadFolders = useCallback(async () => {
    const { folders: folderList, publicRootId: rootId } =
      await getAccessibleFolders(
        userRole,
        userUid,
        accessToken,
        currentFolderId,
      );

    // 保存 publicRootId（仅在根目录时返回）
    if (currentFolderId === null && rootId !== null) {
      setPublicRootId(rootId);
    }

    // 处理文件夹显示名称
    // 只在根目录时，将当前用户的 USER_HOME 显示为"我的文件夹"
    // 在用户目录内，所有 USER_HOME 都显示用户名
    let processedFolders = folderList;
    if (currentFolderId === null) {
      // 根目录时过滤掉 ROOT_PUBLIC（公共空间的文件已通过 mediaFolderId 直接展示）
      processedFolders = folderList
        .filter((folder) => folder.systemType !== "ROOT_PUBLIC")
        .map((folder) => {
          // 只在根目录时，当前用户的 USER_HOME 显示为"我的文件夹"
          if (folder.systemType === "USER_HOME" && folder.userUid === userUid) {
            return { ...folder, name: "我的文件夹" };
          }
          return folder;
        });
    }

    // 在根目录下，保底显示"我的文件夹"入口
    // 即使数据库中还不存在用户的 USER_HOME 文件夹，也显示一个虚拟的入口
    if (currentFolderId === null) {
      const hasUserHome = processedFolders.some(
        (f) => f.systemType === "USER_HOME" && f.userUid === userUid,
      );
      if (!hasUserHome) {
        // 创建一个虚拟的"我的文件夹"入口
        const virtualUserHome: FolderItem = {
          id: -1, // 使用 -1 表示虚拟文件夹
          name: "我的文件夹",
          systemType: "USER_HOME",
          userUid: userUid,
          parentId: null,
          path: "",
          depth: 0,
          order: -1, // 设置为 -1，确保置顶显示
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fileCount: 0, // 虚拟文件夹没有文件
        };
        // 将虚拟文件夹插入到最前面
        processedFolders = [virtualUserHome, ...processedFolders];
      }
    }

    // 排序：
    // 只在根目录时，USER_HOME（当前用户的）和 ROOT_USERS 有特殊排序
    if (currentFolderId === null) {
      processedFolders.sort((a, b) => {
        // 当前用户的 USER_HOME 优先级最高
        const aIsMyHome = a.systemType === "USER_HOME" && a.userUid === userUid;
        const bIsMyHome = b.systemType === "USER_HOME" && b.userUid === userUid;
        if (aIsMyHome && !bIsMyHome) return -1;
        if (bIsMyHome && !aIsMyHome) return 1;

        // ROOT_USERS 第二优先
        if (
          a.systemType === "ROOT_USERS" &&
          b.systemType !== "ROOT_USERS" &&
          !bIsMyHome
        )
          return -1;
        if (
          b.systemType === "ROOT_USERS" &&
          a.systemType !== "ROOT_USERS" &&
          !aIsMyHome
        )
          return 1;

        // 其他按 order 排序
        return a.order - b.order;
      });
    } else {
      // 非根目录，按 order 排序
      processedFolders.sort((a, b) => a.order - b.order);
    }

    setFolders(processedFolders);
  }, [userRole, userUid, accessToken, currentFolderId]);

  // 加载面包屑
  const loadBreadcrumb = useCallback(async () => {
    const breadcrumb = await getFolderBreadcrumb(currentFolderId, accessToken);
    // 直接使用服务器返回的面包屑数据，不做任何处理
    setBreadcrumbItems(breadcrumb);
  }, [currentFolderId, accessToken]);

  // 进入文件夹
  const enterFolder = useCallback(
    async (folderId: number | null) => {
      // 如果点击的是虚拟的"我的文件夹"（id: -1），先创建它
      if (folderId === -1) {
        // 从 localStorage 获取用户名
        let username = "";
        try {
          const userInfoStr = localStorage.getItem("user_info");
          if (userInfoStr) {
            const userInfo = JSON.parse(userInfoStr);
            username = userInfo.username || "";
          }
        } catch (error) {
          console.error("Failed to get username:", error);
        }

        // 调用 Server Action 创建用户主文件夹
        const result = await ensureUserHomeFolder({
          access_token: accessToken,
          userUid,
          username,
        });

        if (result.success && result.data) {
          // 创建成功，进入该文件夹
          setCurrentFolderId(result.data.id);
          // 不需要手动调用 loadFolders，setCurrentFolderId 会触发 useEffect
        } else {
          console.error("Failed to ensure user home folder:", result.message);
        }
      } else {
        setCurrentFolderId(folderId);
      }
      // loadFolders 会在 useEffect 中自动触发
    },
    [accessToken, userUid],
  );

  // 返回上一级
  const goBack = useCallback(async () => {
    if (breadcrumbItems.length <= 1) return;
    const parentItem = breadcrumbItems[breadcrumbItems.length - 2];
    if (parentItem) {
      await enterFolder(parentItem.id);
    }
  }, [breadcrumbItems, enterFolder]);

  // 跳转到面包屑项
  const navigateToBreadcrumb = useCallback(
    async (index: number) => {
      const item = breadcrumbItems[index];
      if (item) {
        await enterFolder(item.id);
      }
    },
    [breadcrumbItems, enterFolder],
  );

  // 初始化和监听文件夹变化
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // 当 currentFolderId 或 folders 变化时，重新加载面包屑
  useEffect(() => {
    loadBreadcrumb();
  }, [loadBreadcrumb, folders]);

  // 计算用于媒体文件查询的文件夹 ID
  // 在根目录时，使用 publicRootId（显示公共空间的文件）
  // 进入子文件夹后，使用 currentFolderId
  const mediaFolderId =
    currentFolderId === null ? publicRootId : currentFolderId;

  return {
    currentFolderId,
    folders,
    breadcrumbItems,
    enterFolder,
    goBack,
    navigateToBreadcrumb,
    loadFolders,
    publicRootId,
    mediaFolderId,
  };
}
