import { email, z } from "zod";
import {
  createSuccessResponseSchema,
  createErrorResponseSchema,
  registerSchema,
} from "./common.js";

/*
    通用Schema组件
*/

// 消息发送状态
export const MessageStatusSchema = z.enum([
  "sending", // 发送中
  "sent", // 已发送
  "read", // 已读
  "failed", // 发送失败
]);
export type MessageStatus = z.infer<typeof MessageStatusSchema>;

// 用户信息（简化版，用于会话列表）
export const ConversationUserSchema = z.object({
  uid: z.number(),
  username: z.string(),
  nickname: z.string().nullable(),
  avatar: z.string().nullable(),
  role: z.enum(["USER", "ADMIN", "EDITOR", "AUTHOR"]),
  emailMd5: z.string().nullable(), // 用于 Gravatar 头像
  isOnline: z.boolean().optional(), // 是否在线
});
export type ConversationUser = z.infer<typeof ConversationUserSchema>;
export type UserSearchResult = ConversationUser; // 别名，用于搜索用户
registerSchema("ConversationUser", ConversationUserSchema);

// 消息对象
export const MessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  type: z.enum(["TEXT", "SYSTEM"]),
  senderUid: z.number(),
  createdAt: z.string(), // ISO 8601 字符串
  // 客户端状态（可选，用于乐观更新）
  status: MessageStatusSchema.optional(),
  // 临时 ID（可选，用于乐观更新）
  tempId: z.string().optional(),
});
export type Message = z.infer<typeof MessageSchema>;
registerSchema("Message", MessageSchema);

// 会话对象
export const ConversationSchema = z.object({
  conversationId: z.string(),
  otherUser: ConversationUserSchema,
  lastMessage: z
    .object({
      content: z.string(),
      createdAt: z.string(), // ISO 8601 字符串
      senderUid: z.number(),
    })
    .nullable(),
  unreadCount: z.number(),
  updatedAt: z.string(), // ISO 8601 字符串
  lastMessageAt: z.string(), // ISO 8601 字符串
  otherUserLastReadMessageId: z.string().nullable().optional(), // 对方已读的最后一条消息ID
});
export type Conversation = z.infer<typeof ConversationSchema>;
registerSchema("Conversation", ConversationSchema);

/*
    <<<<<<<<<< getConversations() schema >>>>>>>>>>
*/

// 获取会话列表请求
export const GetConversationsRequestSchema = z.object({
  lastPolledAt: z.string().optional(), // ISO 8601 字符串
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(50).default(20),
});
export type GetConversationsRequest = z.infer<
  typeof GetConversationsRequestSchema
>;
registerSchema("GetConversationsRequest", GetConversationsRequestSchema);

// 获取会话列表成功响应
export const GetConversationsSuccessResponseSchema =
  createSuccessResponseSchema(
    z.object({
      conversations: z.array(ConversationSchema),
      hasMore: z.boolean(),
      total: z.number(),
    }),
  );
export type GetConversationsSuccessResponse = z.infer<
  typeof GetConversationsSuccessResponseSchema
>;
registerSchema(
  "GetConversationsSuccessResponse",
  GetConversationsSuccessResponseSchema,
);

/*
    <<<<<<<<<< getConversationMessages() schema >>>>>>>>>>
*/

// 获取会话消息请求
export const GetConversationMessagesRequestSchema = z.object({
  conversationId: z.string().uuid(),
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(50).default(25),
});
export type GetConversationMessagesRequest = z.infer<
  typeof GetConversationMessagesRequestSchema
>;
registerSchema(
  "GetConversationMessagesRequest",
  GetConversationMessagesRequestSchema,
);

// 获取会话消息成功响应
export const GetConversationMessagesSuccessResponseSchema =
  createSuccessResponseSchema(
    z.object({
      messages: z.array(MessageSchema),
      hasMore: z.boolean(),
      otherUserLastReadMessageId: z.string().nullable(), // 对方已读的最后一条消息 ID
      unreadMessageCount: z.number().optional(), // 用户的总私信未读数（仅在标记已读后返回）
    }),
  );
export type GetConversationMessagesSuccessResponse = z.infer<
  typeof GetConversationMessagesSuccessResponseSchema
>;
registerSchema(
  "GetConversationMessagesSuccessResponse",
  GetConversationMessagesSuccessResponseSchema,
);

/*
    <<<<<<<<<< sendMessage() schema >>>>>>>>>>
*/

// 发送消息请求
export const SendMessageRequestSchema = z.object({
  targetUid: z.number().int().positive(), // 目标用户 UID
  content: z.string().min(1).max(5000),
  tempId: z.string().optional(), // 临时 ID（用于乐观更新）
});
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
registerSchema("SendMessageRequest", SendMessageRequestSchema);

// 发送消息成功响应
export const SendMessageSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    message: MessageSchema,
    conversationId: z.string().uuid(),
  }),
);
export type SendMessageSuccessResponse = z.infer<
  typeof SendMessageSuccessResponseSchema
>;
registerSchema("SendMessageSuccessResponse", SendMessageSuccessResponseSchema);

/*
    <<<<<<<<<< markConversationAsRead() schema >>>>>>>>>>
*/

// 标记会话已读请求
export const MarkConversationAsReadRequestSchema = z.object({
  conversationId: z.string().uuid(),
});
export type MarkConversationAsReadRequest = z.infer<
  typeof MarkConversationAsReadRequestSchema
>;
registerSchema(
  "MarkConversationAsReadRequest",
  MarkConversationAsReadRequestSchema,
);

// 标记会话已读成功响应
export const MarkConversationAsReadSuccessResponseSchema =
  createSuccessResponseSchema(
    z.object({
      message: z.string(),
      unreadMessageCount: z.number().optional(),
    }),
  );
export type MarkConversationAsReadSuccessResponse = z.infer<
  typeof MarkConversationAsReadSuccessResponseSchema
>;
registerSchema(
  "MarkConversationAsReadSuccessResponse",
  MarkConversationAsReadSuccessResponseSchema,
);

/*
    <<<<<<<<<< deleteConversation() schema >>>>>>>>>>
*/

// 删除会话请求
export const DeleteConversationRequestSchema = z.object({
  conversationId: z.string().uuid(),
});
export type DeleteConversationRequest = z.infer<
  typeof DeleteConversationRequestSchema
>;
registerSchema("DeleteConversationRequest", DeleteConversationRequestSchema);

// 删除会话成功响应
export const DeleteConversationSuccessResponseSchema =
  createSuccessResponseSchema(
    z.object({
      message: z.string(),
    }),
  );
export type DeleteConversationSuccessResponse = z.infer<
  typeof DeleteConversationSuccessResponseSchema
>;
registerSchema(
  "DeleteConversationSuccessResponse",
  DeleteConversationSuccessResponseSchema,
);

/*
    <<<<<<<<<< searchUsers() schema >>>>>>>>>>
*/

// 搜索用户请求
export const SearchUsersRequestSchema = z.object({
  query: z.string().min(1).max(100),
});
export type SearchUsersRequest = z.infer<typeof SearchUsersRequestSchema>;
registerSchema("SearchUsersRequest", SearchUsersRequestSchema);

// 搜索用户成功响应
export const SearchUsersSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    users: z.array(ConversationUserSchema),
  }),
);
export type SearchUsersSuccessResponse = z.infer<
  typeof SearchUsersSuccessResponseSchema
>;
registerSchema("SearchUsersSuccessResponse", SearchUsersSuccessResponseSchema);

/*
    <<<<<<<<<< checkMessagePermission() schema >>>>>>>>>>
*/

// 检查消息权限请求
export const CheckMessagePermissionRequestSchema = z.object({
  targetUid: z.number().int().positive(),
});
export type CheckMessagePermissionRequest = z.infer<
  typeof CheckMessagePermissionRequestSchema
>;
registerSchema(
  "CheckMessagePermissionRequest",
  CheckMessagePermissionRequestSchema,
);

// 检查消息权限成功响应
export const CheckMessagePermissionSuccessResponseSchema =
  createSuccessResponseSchema(
    z.object({
      allowed: z.boolean(),
      reason: z.string().optional(), // 不允许时的原因
    }),
  );
export type CheckMessagePermissionSuccessResponse = z.infer<
  typeof CheckMessagePermissionSuccessResponseSchema
>;
registerSchema(
  "CheckMessagePermissionSuccessResponse",
  CheckMessagePermissionSuccessResponseSchema,
);

/*
    <<<<<<<<<< Error Responses >>>>>>>>>>
*/

// 未授权错误
export const MessageUnauthorizedErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("UNAUTHORIZED"),
    message: z.string(),
  }),
);
export type MessageUnauthorizedErrorResponse = z.infer<
  typeof MessageUnauthorizedErrorResponseSchema
>;
registerSchema(
  "MessageUnauthorizedErrorResponse",
  MessageUnauthorizedErrorResponseSchema,
);

// 会话不存在错误
export const ConversationNotFoundErrorResponseSchema =
  createErrorResponseSchema(
    z.object({
      code: z.literal("CONVERSATION_NOT_FOUND"),
      message: z.string(),
    }),
  );
export type ConversationNotFoundErrorResponse = z.infer<
  typeof ConversationNotFoundErrorResponseSchema
>;
registerSchema(
  "ConversationNotFoundErrorResponse",
  ConversationNotFoundErrorResponseSchema,
);

// 用户不存在错误
export const UserNotFoundErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("USER_NOT_FOUND"),
    message: z.string(),
  }),
);
export type UserNotFoundErrorResponse = z.infer<
  typeof UserNotFoundErrorResponseSchema
>;
registerSchema("UserNotFoundErrorResponse", UserNotFoundErrorResponseSchema);

// 权限不足错误
export const MessagePermissionDeniedErrorResponseSchema =
  createErrorResponseSchema(
    z.object({
      code: z.literal("PERMISSION_DENIED"),
      message: z.string(),
    }),
  );
export type MessagePermissionDeniedErrorResponse = z.infer<
  typeof MessagePermissionDeniedErrorResponseSchema
>;
registerSchema(
  "MessagePermissionDeniedErrorResponse",
  MessagePermissionDeniedErrorResponseSchema,
);

// 消息系统未启用错误
export const MessageSystemDisabledErrorResponseSchema =
  createErrorResponseSchema(
    z.object({
      code: z.literal("MESSAGE_SYSTEM_DISABLED"),
      message: z.string(),
    }),
  );
export type MessageSystemDisabledErrorResponse = z.infer<
  typeof MessageSystemDisabledErrorResponseSchema
>;
registerSchema(
  "MessageSystemDisabledErrorResponse",
  MessageSystemDisabledErrorResponseSchema,
);

// 无效的请求参数错误
export const InvalidMessageRequestErrorResponseSchema =
  createErrorResponseSchema(
    z.object({
      code: z.literal("INVALID_REQUEST"),
      message: z.string(),
    }),
  );
export type InvalidMessageRequestErrorResponse = z.infer<
  typeof InvalidMessageRequestErrorResponseSchema
>;
registerSchema(
  "InvalidMessageRequestErrorResponse",
  InvalidMessageRequestErrorResponseSchema,
);
