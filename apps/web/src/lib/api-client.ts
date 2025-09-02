import { createApiClient } from "@repo/shared-types";
import {
  UsersListResponseSchema,
  UserSchema,
  CreateUserSchema,
  PostsListResponseSchema,
  PostSchema,
  CreatePostSchema,
  type UsersListResponse,
  type User,
  type CreateUser,
  type PostsListResponse,
  type Post,
  type CreatePost,
  type Pagination,
} from "@repo/shared-types";

// 创建 API 客户端实例
const apiClient = createApiClient("/api");

// 用户 API 客户端
export const usersApi = {
  // 获取用户列表，带类型安全和运行时验证
  async getUsers(params?: Partial<Pagination>): Promise<UsersListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

    const url = `/users${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    return apiClient.get(url, UsersListResponseSchema);
  },

  // 创建用户
  async createUser(userData: CreateUser): Promise<User> {
    return apiClient.post("/users", userData, UserSchema);
  },

  // 获取单个用户
  async getUser(id: string): Promise<User> {
    return apiClient.get(`/users/${id}`, UserSchema);
  },

  // 更新用户
  async updateUser(id: string, userData: Partial<CreateUser>): Promise<User> {
    return apiClient.put(`/users/${id}`, userData, UserSchema);
  },

  // 删除用户
  async deleteUser(id: string): Promise<void> {
    return apiClient.delete(`/users/${id}`);
  },
};

// 文章 API 客户端
export const postsApi = {
  // 获取文章列表
  async getPosts(
    params?: Partial<Pagination & { published?: boolean }>,
  ): Promise<PostsListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
    if (params?.published !== undefined)
      searchParams.set("published", params.published.toString());

    const url = `/posts${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    return apiClient.get(url, PostsListResponseSchema);
  },

  // 创建文章
  async createPost(postData: CreatePost): Promise<Post> {
    return apiClient.post("/posts", postData, PostSchema);
  },

  // 获取单个文章
  async getPost(id: string): Promise<Post> {
    return apiClient.get(`/posts/${id}`, PostSchema);
  },

  // 根据 slug 获取文章
  async getPostBySlug(slug: string): Promise<Post> {
    return apiClient.get(`/posts/slug/${slug}`, PostSchema);
  },

  // 更新文章
  async updatePost(id: string, postData: Partial<CreatePost>): Promise<Post> {
    return apiClient.put(`/posts/${id}`, postData, PostSchema);
  },

  // 删除文章
  async deletePost(id: string): Promise<void> {
    return apiClient.delete(`/posts/${id}`);
  },
};

// 导出所有 API
export const api = {
  users: usersApi,
  posts: postsApi,
};
