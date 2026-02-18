import "server-only";

import { getConfigs } from "@/lib/server/config-cache";
import prisma from "@/lib/server/prisma";
import { cleanupStorageTempFolders } from "@/lib/server/storage-temp-cleanup";

const AUTO_CLEANUP_CONFIG_KEYS = [
  "cron.task.cleanup.searchLog.retentionDays",
  "cron.task.cleanup.healthCheck.retentionDays",
  "cron.task.cleanup.auditLog.retentionDays",
  "cron.task.cleanup.cronHistory.retentionDays",
  "cron.task.cleanup.cloudTriggerHistory.retentionDays",
  "cron.task.cleanup.notice.retentionDays",
  "cron.task.cleanup.recycleBin.retentionDays",
  "cron.task.cleanup.mailSubscriptionUnsubscribed.retentionDays",
  "cron.task.cleanup.refreshToken.expiredRetentionDays",
  "cron.task.cleanup.passwordReset.retentionMinutes",
  "cron.task.cleanup.pushSubscription.markInactiveDays",
  "cron.task.cleanup.pushSubscription.deleteInactiveDays",
  "cron.task.cleanup.pushSubscription.deleteDisabledUserDays",
] as const;

function toNonNegativeInt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
}

function getCutoffDateByDays(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function getCutoffDateByMinutes(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

export type AutoCleanupResult = {
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

export async function runAutoCleanupMaintenance(): Promise<AutoCleanupResult> {
  const [
    searchLogRetentionDaysRaw,
    healthCheckRetentionDaysRaw,
    auditLogRetentionDaysRaw,
    cronHistoryRetentionDaysRaw,
    cloudTriggerHistoryRetentionDaysRaw,
    noticeRetentionDaysRaw,
    recycleBinRetentionDaysRaw,
    mailSubscriptionUnsubscribedRetentionDaysRaw,
    refreshTokenExpiredRetentionDaysRaw,
    passwordResetRetentionMinutesRaw,
    pushSubscriptionMarkInactiveDaysRaw,
    pushSubscriptionDeleteInactiveDaysRaw,
    pushSubscriptionDeleteDisabledUserDaysRaw,
  ] = await getConfigs([...AUTO_CLEANUP_CONFIG_KEYS]);

  const searchLogRetentionDays = toNonNegativeInt(searchLogRetentionDaysRaw);
  const healthCheckRetentionDays = toNonNegativeInt(
    healthCheckRetentionDaysRaw,
  );
  const auditLogRetentionDays = toNonNegativeInt(auditLogRetentionDaysRaw);
  const cronHistoryRetentionDays = toNonNegativeInt(
    cronHistoryRetentionDaysRaw,
  );
  const cloudTriggerHistoryRetentionDays = toNonNegativeInt(
    cloudTriggerHistoryRetentionDaysRaw,
  );
  const noticeRetentionDays = toNonNegativeInt(noticeRetentionDaysRaw);
  const recycleBinRetentionDays = toNonNegativeInt(recycleBinRetentionDaysRaw);
  const mailSubscriptionUnsubscribedRetentionDays = toNonNegativeInt(
    mailSubscriptionUnsubscribedRetentionDaysRaw,
  );
  const refreshTokenExpiredRetentionDays = toNonNegativeInt(
    refreshTokenExpiredRetentionDaysRaw,
  );
  const passwordResetRetentionMinutes = toNonNegativeInt(
    passwordResetRetentionMinutesRaw,
  );
  const pushSubscriptionMarkInactiveDays = toNonNegativeInt(
    pushSubscriptionMarkInactiveDaysRaw,
  );
  const pushSubscriptionDeleteInactiveDays = toNonNegativeInt(
    pushSubscriptionDeleteInactiveDaysRaw,
  );
  const pushSubscriptionDeleteDisabledUserDays = toNonNegativeInt(
    pushSubscriptionDeleteDisabledUserDaysRaw,
  );

  const searchLogCutoffDate = getCutoffDateByDays(searchLogRetentionDays);
  const healthCheckCutoffDate = getCutoffDateByDays(healthCheckRetentionDays);
  const auditLogCutoffDate = getCutoffDateByDays(auditLogRetentionDays);
  const cronHistoryCutoffDate = getCutoffDateByDays(cronHistoryRetentionDays);
  const cloudTriggerHistoryCutoffDate = getCutoffDateByDays(
    cloudTriggerHistoryRetentionDays,
  );
  const noticeCutoffDate = getCutoffDateByDays(noticeRetentionDays);
  const recycleBinCutoffDate = getCutoffDateByDays(recycleBinRetentionDays);
  const mailSubscriptionUnsubscribedCutoffDate = getCutoffDateByDays(
    mailSubscriptionUnsubscribedRetentionDays,
  );
  const refreshTokenCutoffDate = getCutoffDateByDays(
    refreshTokenExpiredRetentionDays,
  );
  const passwordResetCutoffDate = getCutoffDateByMinutes(
    passwordResetRetentionMinutes,
  );
  const pushMarkInactiveCutoffDate = getCutoffDateByDays(
    pushSubscriptionMarkInactiveDays,
  );
  const pushDeleteInactiveCutoffDate = getCutoffDateByDays(
    pushSubscriptionDeleteInactiveDays,
  );
  const pushDeleteDisabledUserCutoffDate = getCutoffDateByDays(
    pushSubscriptionDeleteDisabledUserDays,
  );

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
          lt: searchLogCutoffDate,
        },
      },
    }),
    prisma.healthCheck.deleteMany({
      where: {
        createdAt: {
          lt: healthCheckCutoffDate,
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
          lt: mailSubscriptionUnsubscribedCutoffDate,
        },
      },
    }),
    prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: refreshTokenCutoffDate,
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
          lt: pushMarkInactiveCutoffDate,
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
          lt: pushDeleteInactiveCutoffDate,
        },
      },
    }),
    prisma.pushSubscription.deleteMany({
      where: {
        isActive: false,
        lastUsedAt: {
          lt: pushDeleteDisabledUserCutoffDate,
          gte: pushDeleteInactiveCutoffDate,
        },
        user: {
          webPushEnabled: false,
        },
      },
    }),
  ]);

  if (storageCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: storage temp cleanup failed",
      storageCleanup.reason,
    );
  }
  if (searchLogCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: search log cleanup failed",
      searchLogCleanup.reason,
    );
  }
  if (healthCheckCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: health check cleanup failed",
      healthCheckCleanup.reason,
    );
  }
  if (auditLogCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: audit log cleanup failed",
      auditLogCleanup.reason,
    );
  }
  if (cronHistoryCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: cron history cleanup failed",
      cronHistoryCleanup.reason,
    );
  }
  if (cloudTriggerHistoryCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: cloud trigger history cleanup failed",
      cloudTriggerHistoryCleanup.reason,
    );
  }
  if (noticeCleanup.status === "rejected") {
    console.error("Auto cleanup: notice cleanup failed", noticeCleanup.reason);
  }
  if (recycleProjectCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: recycle project cleanup failed",
      recycleProjectCleanup.reason,
    );
  }
  if (recycleFriendLinkCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: recycle friend link cleanup failed",
      recycleFriendLinkCleanup.reason,
    );
  }
  if (recyclePostCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: recycle post cleanup failed",
      recyclePostCleanup.reason,
    );
  }
  if (recyclePageCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: recycle page cleanup failed",
      recyclePageCleanup.reason,
    );
  }
  if (recycleCommentCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: recycle comment cleanup failed",
      recycleCommentCleanup.reason,
    );
  }
  if (recycleUserCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: recycle user cleanup failed",
      recycleUserCleanup.reason,
    );
  }
  if (recycleMessageCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: recycle message cleanup failed",
      recycleMessageCleanup.reason,
    );
  }
  if (unsubscribedMailSubscriptionCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: unsubscribed mail subscription cleanup failed",
      unsubscribedMailSubscriptionCleanup.reason,
    );
  }
  if (refreshTokenCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: refresh token cleanup failed",
      refreshTokenCleanup.reason,
    );
  }
  if (passwordResetCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: password reset cleanup failed",
      passwordResetCleanup.reason,
    );
  }
  if (pushMarkInactiveCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: push mark inactive cleanup failed",
      pushMarkInactiveCleanup.reason,
    );
  }
  if (pushDeleteInactiveCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: push inactive cleanup failed",
      pushDeleteInactiveCleanup.reason,
    );
  }
  if (pushDeleteDisabledUserCleanup.status === "rejected") {
    console.error(
      "Auto cleanup: push disabled-user cleanup failed",
      pushDeleteDisabledUserCleanup.reason,
    );
  }

  const recycleBinDeleted =
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
      : 0);

  return {
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
    recycleBinDeleted,
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

// 兼容旧调用，后续可移除。
export async function runDoctorMaintenance(): Promise<AutoCleanupResult> {
  return runAutoCleanupMaintenance();
}
