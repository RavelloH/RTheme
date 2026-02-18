import "server-only";

import prisma from "@/lib/server/prisma";
import { cleanupStorageTempFolders } from "@/lib/server/storage-temp-cleanup";

const DEFAULT_RETENTION_DAYS = 90;
const AUDIT_LOG_RETENTION_DAYS = 180;
const CRON_HISTORY_RETENTION_DAYS = 90;
const CLOUD_TRIGGER_HISTORY_RETENTION_DAYS = 90;
const NOTICE_RETENTION_DAYS = 365;
const RECYCLE_BIN_RETENTION_DAYS = 30;
const MAIL_SUBSCRIPTION_UNSUBSCRIBED_RETENTION_DAYS = 30;
const PUSH_SUBSCRIPTION_INACTIVE_AFTER_DAYS = 30;
const PUSH_SUBSCRIPTION_DELETE_AFTER_DAYS = 90;
const PUSH_SUBSCRIPTION_DISABLED_USER_DELETE_AFTER_DAYS = 30;
const PASSWORD_RESET_VALIDITY_MS = 30 * 60 * 1000;

function getCutoffDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export type DoctorMaintenanceResult = {
  retentionDays: number;
  searchLogDeleted: number;
  healthCheckDeleted: number;
  auditLogDeleted: number;
  cronHistoryDeleted: number;
  cloudTriggerHistoryDeleted: number;
  noticeDeleted: number;
  recycleBinDeleted: number;
  unsubscribedMailSubscriptionDeleted: number;
  storageTempCleanupSuccess: boolean;
  refreshTokenDeleted: number;
  passwordResetDeleted: number;
  pushSubscriptionsMarkedInactive: number;
  pushSubscriptionsDeletedInactive: number;
  pushSubscriptionsDeletedForDisabledUsers: number;
};

export async function runDoctorMaintenance(
  retentionDays = DEFAULT_RETENTION_DAYS,
): Promise<DoctorMaintenanceResult> {
  const cutoffDate = getCutoffDate(retentionDays);
  const auditLogCutoffDate = getCutoffDate(AUDIT_LOG_RETENTION_DAYS);
  const cronHistoryCutoffDate = getCutoffDate(CRON_HISTORY_RETENTION_DAYS);
  const cloudTriggerHistoryCutoffDate = getCutoffDate(
    CLOUD_TRIGGER_HISTORY_RETENTION_DAYS,
  );
  const noticeCutoffDate = getCutoffDate(NOTICE_RETENTION_DAYS);
  const recycleBinCutoffDate = getCutoffDate(RECYCLE_BIN_RETENTION_DAYS);
  const unsubscribedMailSubscriptionCutoffDate = getCutoffDate(
    MAIL_SUBSCRIPTION_UNSUBSCRIBED_RETENTION_DAYS,
  );
  const pushInactiveCutoffDate = getCutoffDate(
    PUSH_SUBSCRIPTION_INACTIVE_AFTER_DAYS,
  );
  const pushDeleteCutoffDate = getCutoffDate(
    PUSH_SUBSCRIPTION_DELETE_AFTER_DAYS,
  );
  const pushDisabledUserDeleteCutoffDate = getCutoffDate(
    PUSH_SUBSCRIPTION_DISABLED_USER_DELETE_AFTER_DAYS,
  );
  const passwordResetCutoffDate = new Date(
    Date.now() - PASSWORD_RESET_VALIDITY_MS,
  );
  const now = new Date();

  const [
    storageCleanup,
    searchLogCleanup,
    healthCheckCleanup,
    auditLogCleanup,
    cronHistoryCleanup,
    cloudTriggerHistoryCleanup,
    noticeCleanup,
    recycleProjectCleanup,
    recycleFriendLinkCleanup,
    recyclePostCleanup,
    recyclePageCleanup,
    recycleCommentCleanup,
    recycleUserCleanup,
    recycleMessageCleanup,
    unsubscribedMailSubscriptionCleanup,
    refreshTokenCleanup,
    passwordResetCleanup,
    pushMarkInactiveCleanup,
    pushDeleteInactiveCleanup,
    pushDeleteDisabledUserCleanup,
  ] = await Promise.allSettled([
    cleanupStorageTempFolders(),
    prisma.searchLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    }),
    prisma.healthCheck.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    }),
    prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: auditLogCutoffDate,
        },
      },
    }),
    prisma.cronHistory.deleteMany({
      where: {
        createdAt: {
          lt: cronHistoryCutoffDate,
        },
      },
    }),
    prisma.cloudTriggerHistory.deleteMany({
      where: {
        createdAt: {
          lt: cloudTriggerHistoryCutoffDate,
        },
      },
    }),
    prisma.notice.deleteMany({
      where: {
        createdAt: {
          lt: noticeCutoffDate,
        },
      },
    }),
    prisma.project.deleteMany({
      where: {
        deletedAt: {
          lt: recycleBinCutoffDate,
        },
      },
    }),
    prisma.friendLink.deleteMany({
      where: {
        deletedAt: {
          lt: recycleBinCutoffDate,
        },
      },
    }),
    prisma.post.deleteMany({
      where: {
        deletedAt: {
          lt: recycleBinCutoffDate,
        },
      },
    }),
    prisma.page.deleteMany({
      where: {
        deletedAt: {
          lt: recycleBinCutoffDate,
        },
      },
    }),
    prisma.comment.deleteMany({
      where: {
        deletedAt: {
          lt: recycleBinCutoffDate,
        },
      },
    }),
    prisma.user.deleteMany({
      where: {
        deletedAt: {
          lt: recycleBinCutoffDate,
        },
      },
    }),
    prisma.message.deleteMany({
      where: {
        deletedAt: {
          lt: recycleBinCutoffDate,
        },
      },
    }),
    prisma.mailSubscription.deleteMany({
      where: {
        status: "UNSUBSCRIBED",
        unsubscribedAt: {
          lt: unsubscribedMailSubscriptionCutoffDate,
        },
      },
    }),
    prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    }),
    prisma.passwordReset.deleteMany({
      where: {
        createdAt: {
          lt: passwordResetCutoffDate,
        },
      },
    }),
    prisma.pushSubscription.updateMany({
      where: {
        isActive: true,
        lastUsedAt: {
          lt: pushInactiveCutoffDate,
        },
      },
      data: {
        isActive: false,
      },
    }),
    prisma.pushSubscription.deleteMany({
      where: {
        isActive: false,
        lastUsedAt: {
          lt: pushDeleteCutoffDate,
        },
      },
    }),
    prisma.pushSubscription.deleteMany({
      where: {
        isActive: false,
        lastUsedAt: {
          lt: pushDisabledUserDeleteCutoffDate,
          gte: pushDeleteCutoffDate,
        },
        user: {
          webPushEnabled: false,
        },
      },
    }),
  ]);

  if (storageCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: storage temp cleanup failed",
      storageCleanup.reason,
    );
  }
  if (searchLogCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: search log cleanup failed",
      searchLogCleanup.reason,
    );
  }
  if (healthCheckCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: health check cleanup failed",
      healthCheckCleanup.reason,
    );
  }
  if (auditLogCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: audit log cleanup failed",
      auditLogCleanup.reason,
    );
  }
  if (cronHistoryCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: cron history cleanup failed",
      cronHistoryCleanup.reason,
    );
  }
  if (cloudTriggerHistoryCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: cloud trigger history cleanup failed",
      cloudTriggerHistoryCleanup.reason,
    );
  }
  if (noticeCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: notice cleanup failed",
      noticeCleanup.reason,
    );
  }
  if (recycleProjectCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: recycle project cleanup failed",
      recycleProjectCleanup.reason,
    );
  }
  if (recycleFriendLinkCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: recycle friend link cleanup failed",
      recycleFriendLinkCleanup.reason,
    );
  }
  if (recyclePostCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: recycle post cleanup failed",
      recyclePostCleanup.reason,
    );
  }
  if (recyclePageCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: recycle page cleanup failed",
      recyclePageCleanup.reason,
    );
  }
  if (recycleCommentCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: recycle comment cleanup failed",
      recycleCommentCleanup.reason,
    );
  }
  if (recycleUserCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: recycle user cleanup failed",
      recycleUserCleanup.reason,
    );
  }
  if (recycleMessageCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: recycle message cleanup failed",
      recycleMessageCleanup.reason,
    );
  }
  if (unsubscribedMailSubscriptionCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: unsubscribed mail subscription cleanup failed",
      unsubscribedMailSubscriptionCleanup.reason,
    );
  }
  if (refreshTokenCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: refresh token cleanup failed",
      refreshTokenCleanup.reason,
    );
  }
  if (passwordResetCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: password reset cleanup failed",
      passwordResetCleanup.reason,
    );
  }
  if (pushMarkInactiveCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: push mark inactive cleanup failed",
      pushMarkInactiveCleanup.reason,
    );
  }
  if (pushDeleteInactiveCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: push inactive cleanup failed",
      pushDeleteInactiveCleanup.reason,
    );
  }
  if (pushDeleteDisabledUserCleanup.status === "rejected") {
    console.error(
      "Doctor maintenance: push disabled-user cleanup failed",
      pushDeleteDisabledUserCleanup.reason,
    );
  }

  return {
    retentionDays,
    searchLogDeleted:
      searchLogCleanup.status === "fulfilled"
        ? searchLogCleanup.value.count
        : 0,
    healthCheckDeleted:
      healthCheckCleanup.status === "fulfilled"
        ? healthCheckCleanup.value.count
        : 0,
    auditLogDeleted:
      auditLogCleanup.status === "fulfilled" ? auditLogCleanup.value.count : 0,
    cronHistoryDeleted:
      cronHistoryCleanup.status === "fulfilled"
        ? cronHistoryCleanup.value.count
        : 0,
    cloudTriggerHistoryDeleted:
      cloudTriggerHistoryCleanup.status === "fulfilled"
        ? cloudTriggerHistoryCleanup.value.count
        : 0,
    noticeDeleted:
      noticeCleanup.status === "fulfilled" ? noticeCleanup.value.count : 0,
    recycleBinDeleted:
      (recycleProjectCleanup.status === "fulfilled"
        ? recycleProjectCleanup.value.count
        : 0) +
      (recycleFriendLinkCleanup.status === "fulfilled"
        ? recycleFriendLinkCleanup.value.count
        : 0) +
      (recyclePostCleanup.status === "fulfilled"
        ? recyclePostCleanup.value.count
        : 0) +
      (recyclePageCleanup.status === "fulfilled"
        ? recyclePageCleanup.value.count
        : 0) +
      (recycleCommentCleanup.status === "fulfilled"
        ? recycleCommentCleanup.value.count
        : 0) +
      (recycleUserCleanup.status === "fulfilled"
        ? recycleUserCleanup.value.count
        : 0) +
      (recycleMessageCleanup.status === "fulfilled"
        ? recycleMessageCleanup.value.count
        : 0),
    unsubscribedMailSubscriptionDeleted:
      unsubscribedMailSubscriptionCleanup.status === "fulfilled"
        ? unsubscribedMailSubscriptionCleanup.value.count
        : 0,
    storageTempCleanupSuccess: storageCleanup.status === "fulfilled",
    refreshTokenDeleted:
      refreshTokenCleanup.status === "fulfilled"
        ? refreshTokenCleanup.value.count
        : 0,
    passwordResetDeleted:
      passwordResetCleanup.status === "fulfilled"
        ? passwordResetCleanup.value.count
        : 0,
    pushSubscriptionsMarkedInactive:
      pushMarkInactiveCleanup.status === "fulfilled"
        ? pushMarkInactiveCleanup.value.count
        : 0,
    pushSubscriptionsDeletedInactive:
      pushDeleteInactiveCleanup.status === "fulfilled"
        ? pushDeleteInactiveCleanup.value.count
        : 0,
    pushSubscriptionsDeletedForDisabledUsers:
      pushDeleteDisabledUserCleanup.status === "fulfilled"
        ? pushDeleteDisabledUserCleanup.value.count
        : 0,
  };
}
