"use client";

import { getUsersList } from "@/actions/user";
import GridTable, { ActionButton } from "@/components/GridTable";
import { TableColumn } from "@/ui/Table";
import { useEffect, useState } from "react";
import type { UserListItem } from "@repo/shared-types/api/user";
import { useBroadcast } from "@/hooks/useBroadcast";
import Image from "next/image";
import {
  RiCheckLine,
  RiCloseLine,
  RiEditLine,
  RiDeleteBinLine,
  RiUserSettingsLine,
  RiShieldUserLine,
} from "@remixicon/react";
import Avatar from "boring-avatars";
import generateGradient from "@/lib/shared/gradient";
import generateComplementary from "@/lib/shared/complementary";

export default function UsersTable({ mainColor }: { mainColor: string }) {
  const [data, setData] = useState<UserListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<(string | number)[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // 处理选中状态变化
  const handleSelectionChange = (selectedKeys: (string | number)[]) => {
    setSelectedUsers(selectedKeys);
    console.log("选中的用户 UID:", selectedKeys);
  };

  // 批量操作按钮
  const batchActions: ActionButton[] = [
    {
      label: "更改状态",
      onClick: () => {
        console.log("批量更改状态:", selectedUsers);
        // TODO: 实现批量更改状态功能
      },
      icon: <RiUserSettingsLine size="1em" />,
      variant: "ghost",
    },
    {
      label: "更改角色",
      onClick: () => {
        console.log("批量更改角色:", selectedUsers);
        // TODO: 实现批量更改角色功能
      },
      icon: <RiShieldUserLine size="1em" />,
      variant: "ghost",
    },
    {
      label: "删除",
      onClick: () => {
        console.log("批量删除用户:", selectedUsers);
        // TODO: 实现批量删除功能
      },
      icon: <RiDeleteBinLine size="1em" />,
      variant: "danger",
    },
  ];

  // 行操作按钮
  const rowActions = (record: UserListItem): ActionButton[] => [
    {
      onClick: () => {
        console.log("编辑用户:", record);
        // TODO: 实现编辑用户功能
      },
      icon: <RiEditLine size="1em" />,
      variant: "ghost",
    },
    {
      onClick: () => {
        console.log("删除用户:", record);
        // TODO: 实现删除用户功能
      },
      icon: <RiDeleteBinLine size="1em" />,
      variant: "danger",
    },
  ];

  // 处理排序变化
  const handleSortChange = (key: string, order: "asc" | "desc" | null) => {
    setSortKey(order ? key : null);
    setSortOrder(order);
    setPage(1); // 排序变化时重置到第一页
  };

  // 处理搜索变化
  const handleSearchChange = (search: string) => {
    setSearchQuery(search);
    setPage(1); // 搜索变化时重置到第一页
  };

  // 监听广播刷新消息
  useBroadcast<{ type: string }>(async (message) => {
    if (message.type === "users-refresh") {
      setRefreshTrigger((prev) => prev + 1); // 触发刷新
    }
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // 构建请求参数
        const params: {
          page: number;
          pageSize: number;
          sortBy?: "uid" | "username" | "createdAt" | "lastUseAt";
          sortOrder?: "asc" | "desc";
          search?: string;
        } = {
          page,
          pageSize,
        };

        // 只在有有效的排序参数时才添加
        if (sortKey && sortOrder) {
          params.sortBy = sortKey as
            | "uid"
            | "username"
            | "createdAt"
            | "lastUseAt";
          params.sortOrder = sortOrder;
        }

        // 添加搜索参数
        if (searchQuery && searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        const result = await getUsersList({
          ...params,
          sortBy: params.sortBy || "uid",
          sortOrder: params.sortOrder || "asc",
        });

        if (result.success && result.data) {
          setData(result.data);
          setTotalRecords(result.meta?.total || 0);
          if (result.meta) {
            setTotalPages(result.meta.totalPages);
          }
        }
      } catch (error) {
        console.error("Failed to fetch users list:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [page, pageSize, sortKey, sortOrder, searchQuery, refreshTrigger]);

  const columns: TableColumn<UserListItem>[] = [
    {
      key: "uid",
      title: "ID",
      dataIndex: "uid",
      align: "left",
      sortable: true,
      mono: true,
    },
    {
      key: "avatar",
      title: "头像",
      dataIndex: "avatar",
      align: "left",
      render: (value: unknown, record: UserListItem) => {
        const username = record.username;
        return typeof value === "string" && value ? (
          <Image
            src={value}
            alt="avatar"
            width={32}
            height={32}
            className="rounded-full object-cover"
          />
        ) : (
          <Avatar
            name={username}
            colors={generateGradient(
              mainColor,
              generateComplementary(mainColor),
              4,
            )}
            variant="marble"
            size={32}
          />
        );
      },
    },
    {
      key: "username",
      title: "用户名",
      dataIndex: "username",
      align: "left",
      sortable: true,
      mono: true,
    },
    {
      key: "nickname",
      title: "昵称",
      dataIndex: "nickname",
      align: "left",
      render: (value: unknown) => {
        return (
          <span className="text-sm">
            {value && typeof value === "string" ? value : "-"}
          </span>
        );
      },
    },
    {
      key: "email",
      title: "邮箱",
      dataIndex: "email",
      align: "left",
      mono: true,
      render: (value: unknown, record: UserListItem) => {
        return (
          <div className="flex items-center gap-2">
            {record.emailVerified ? (
              <span className="text-xs text-success">
                <RiCheckLine size="1.5em" />
              </span>
            ) : (
              <span className="text-xs text-error">
                <RiCloseLine size="1.5em" />
              </span>
            )}
            <span className="text-sm">{String(value)}</span>
          </div>
        );
      },
    },
    {
      key: "role",
      title: "角色",
      dataIndex: "role",
      align: "center",
      render: (value: unknown) => {
        const role = String(value);
        const colorClass =
          role === "ADMIN"
            ? "bg-error/20 text-error"
            : role === "EDITOR"
              ? "bg-warning/20 text-warning"
              : role === "AUTHOR"
                ? "bg-info/20 text-info"
                : "bg-muted text-muted-foreground";
        return (
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${colorClass}`}
          >
            {role}
          </span>
        );
      },
    },
    {
      key: "status",
      title: "状态",
      dataIndex: "status",
      align: "center",
      render: (value: unknown) => {
        const status = String(value);
        const colorClass =
          status === "ACTIVE"
            ? "bg-success/20 text-success"
            : status === "SUSPENDED"
              ? "bg-error/20 text-error"
              : "bg-warning/20 text-warning";
        const statusText =
          status === "ACTIVE"
            ? "正常"
            : status === "SUSPENDED"
              ? "已封禁"
              : "需更新";
        return (
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${colorClass}`}
          >
            {statusText}
          </span>
        );
      },
    },
    {
      key: "website",
      title: "网站",
      dataIndex: "website",
      align: "left",
      render: (value: unknown) => {
        if (value && typeof value === "string") {
          return (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              链接
            </a>
          );
        }
        return <span className="text-muted-foreground">-</span>;
      },
    },
    {
      key: "bio",
      title: "简介",
      dataIndex: "bio",
      align: "left",
      render: (value: unknown) => {
        return (
          <span className="text-sm truncate max-w-[200px] block">
            {value && typeof value === "string" ? value : "-"}
          </span>
        );
      },
    },
    {
      key: "emailNotice",
      title: "邮件通知",
      dataIndex: "emailNotice",
      align: "center",
      render: (value: unknown) => {
        return value === true ? (
          <RiCheckLine size="1.5em" />
        ) : (
          <span className="flex justify-center">
            <RiCloseLine size="1.5em" className="text-muted-foreground" />
          </span>
        );
      },
    },
    {
      key: "createdAt",
      title: "创建时间",
      dataIndex: "createdAt",
      sortable: true,
      mono: true,
      render: (value: unknown) => {
        if (typeof value === "string") {
          return new Date(value).toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
        }
        return "-";
      },
    },
    {
      key: "lastUseAt",
      title: "最后活跃",
      dataIndex: "lastUseAt",
      sortable: true,
      mono: true,
      render: (value: unknown) => {
        if (typeof value === "string") {
          return new Date(value).toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
        }
        return "-";
      },
    },
  ];

  return (
    <GridTable
      title="用户列表"
      columns={columns}
      data={data}
      loading={loading}
      rowKey="uid"
      page={page}
      totalPages={totalPages}
      totalRecords={totalRecords}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      onSortChange={handleSortChange}
      onSearchChange={handleSearchChange}
      searchPlaceholder="搜索用户名、昵称或邮箱..."
      striped
      hoverable
      bordered={false}
      size="sm"
      emptyText="暂无用户记录"
      stickyHeader
      maxHeight="100%"
      padding={2.5}
      // 启用操作模式
      enableActions={true}
      batchActions={batchActions}
      rowActions={rowActions}
      onSelectionChange={handleSelectionChange}
    />
  );
}
