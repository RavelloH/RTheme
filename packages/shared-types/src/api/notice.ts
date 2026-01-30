import { z } from "zod";
import {
  createSuccessResponseSchema,
  createErrorResponseSchema,
  registerSchema,
} from "./common.js";

/*
    通用Schema组件
*/

// 通知对象
export const NoticeSchema = z.object({
  id: z.string(),
  title: z.string(), // 通知标题
  content: z.string(), // 通知正文
  link: z.string().nullable(),
  isRead: z.boolean(),
  createdAt: z.string(), // ISO 8601 字符串
});
export type Notice = z.infer<typeof NoticeSchema>;
registerSchema("Notice", NoticeSchema);

/*
    <<<<<<<<<< getNotices() schema >>>>>>>>>>
*/

// 获取通知列表成功响应
export const GetNoticesSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    unread: z.array(NoticeSchema),
    read: z.array(NoticeSchema),
    total: z.number(),
    unreadCount: z.number(),
    hasMoreRead: z.boolean().optional(), // 是否有更多已读通知
  }),
);
export type GetNoticesSuccessResponse = z.infer<
  typeof GetNoticesSuccessResponseSchema
>;
registerSchema("GetNoticesSuccessResponse", GetNoticesSuccessResponseSchema);

/*
    <<<<<<<<<< markNoticesAsRead() schema >>>>>>>>>>
*/

// 标记通知为已读请求
export const MarkNoticesAsReadSchema = z.object({
  noticeIds: z.array(z.string()).min(1, "至少需要一个通知ID"),
});
export type MarkNoticesAsRead = z.infer<typeof MarkNoticesAsReadSchema>;
registerSchema("MarkNoticesAsRead", MarkNoticesAsReadSchema);

// 标记通知为已读成功响应
export const MarkNoticesAsReadSuccessResponseSchema =
  createSuccessResponseSchema(
    z.object({
      message: z.string(),
    }),
  );
export type MarkNoticesAsReadSuccessResponse = z.infer<
  typeof MarkNoticesAsReadSuccessResponseSchema
>;
registerSchema(
  "MarkNoticesAsReadSuccessResponse",
  MarkNoticesAsReadSuccessResponseSchema,
);

/*
    <<<<<<<<<< markAllNoticesAsRead() schema >>>>>>>>>>
*/

// 标记所有通知为已读成功响应
export const MarkAllNoticesAsReadSuccessResponseSchema =
  createSuccessResponseSchema(
    z.object({
      message: z.string(),
    }),
  );
export type MarkAllNoticesAsReadSuccessResponse = z.infer<
  typeof MarkAllNoticesAsReadSuccessResponseSchema
>;
registerSchema(
  "MarkAllNoticesAsReadSuccessResponse",
  MarkAllNoticesAsReadSuccessResponseSchema,
);

/*
    <<<<<<<<<< getUnreadNoticeCount() schema >>>>>>>>>>
*/

// 获取未读通知数量成功响应
export const GetUnreadNoticeCountSuccessResponseSchema =
  createSuccessResponseSchema(
    z.object({
      count: z.number(),
      messageCount: z.number(), // 私信未读数
    }),
  );
export type GetUnreadNoticeCountSuccessResponse = z.infer<
  typeof GetUnreadNoticeCountSuccessResponseSchema
>;
registerSchema(
  "GetUnreadNoticeCountSuccessResponse",
  GetUnreadNoticeCountSuccessResponseSchema,
);

/*
    <<<<<<<<<< Error Responses >>>>>>>>>>
*/

// 未授权错误
export const NoticeUnauthorizedErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("UNAUTHORIZED"),
    message: z.string(),
  }),
);
export type NoticeUnauthorizedErrorResponse = z.infer<
  typeof NoticeUnauthorizedErrorResponseSchema
>;
registerSchema(
  "NoticeUnauthorizedErrorResponse",
  NoticeUnauthorizedErrorResponseSchema,
);

// 无效的通知ID错误
export const InvalidNoticeIdsErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("INVALID_NOTICE_IDS"),
    message: z.string(),
  }),
);
export type InvalidNoticeIdsErrorResponse = z.infer<
  typeof InvalidNoticeIdsErrorResponseSchema
>;
registerSchema(
  "InvalidNoticeIdsErrorResponse",
  InvalidNoticeIdsErrorResponseSchema,
);

// 通知不存在错误
export const NoticeNotFoundErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("NOTICE_NOT_FOUND"),
    message: z.string(),
  }),
);
export type NoticeNotFoundErrorResponse = z.infer<
  typeof NoticeNotFoundErrorResponseSchema
>;
registerSchema(
  "NoticeNotFoundErrorResponse",
  NoticeNotFoundErrorResponseSchema,
);
