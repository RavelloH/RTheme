import { refresh } from "@/actions/auth";
import type {
  ApiResponse,
  ApiResponseData,
} from "@repo/shared-types/api/common";
import type { RefreshToken } from "@repo/shared-types/api/auth";
import type { NextResponse } from "next/server";

type PossibleResult<T extends ApiResponseData> =
  | ApiResponse<T>
  | NextResponse<ApiResponse<T>>;

type AuthAction<Params, Data extends ApiResponseData> = (
  params: Params,
) => Promise<PossibleResult<Data>>;

interface RunWithAuthOptions {
  refreshParams?: RefreshToken;
  retryErrorCode?: string;
}

const DEFAULT_REFRESH_PARAMS: RefreshToken = {
  token_transport: "cookie",
};

// Extracts the unified ApiResponse regardless of server action return type.
export async function resolveApiResponse<T extends ApiResponseData>(
  result: PossibleResult<T>,
): Promise<ApiResponse<T> | undefined> {
  if (result instanceof Response) {
    try {
      const cloned = result.clone();
      return (await cloned.json()) as ApiResponse<T>;
    } catch (error) {
      console.error("Failed to parse action response", error);
      return undefined;
    }
  }

  return result;
}

export default async function runWithAuth<Params, Data extends ApiResponseData>(
  action: AuthAction<Params, Data>,
  params: Params,
  options: RunWithAuthOptions = {},
): Promise<PossibleResult<Data>> {
  const retryErrorCode = options.retryErrorCode ?? "UNAUTHORIZED";

  const initialResult = await action(params);
  const initialResponse = await resolveApiResponse(initialResult);

  if (initialResponse?.error?.code !== retryErrorCode) {
    return initialResult;
  }

  const refreshResult = await refresh(
    options.refreshParams ?? DEFAULT_REFRESH_PARAMS,
  );
  const refreshResponse = await resolveApiResponse(refreshResult);

  if (!refreshResponse?.success) {
    return initialResult;
  }

  return action(params);
}
