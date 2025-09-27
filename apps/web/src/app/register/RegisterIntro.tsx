"use client";

import { useConfig } from "@/components/ConfigProvider";

export function RegisterIntro() {
  const { config } = useConfig();
  const canRegister = config<boolean>("user.registration.enabled");
  const isNeedEmailVerify = config<boolean>("user.email.verification.required");
  if (!canRegister) {
    return <div>此站点已关闭公开注册，请联系管理员以了解详情。</div>;
  }
  return (
    <>
      <div>欢迎加入，注册一个个人账户以便保存并同步你的个人信息等，</div>
      <div>你可以使用任意邮箱注册。</div>
      {isNeedEmailVerify && (
        <>
          <br />
          <div>我们会向你的邮箱发送一封验证邮件，</div>
          <div>验证邮箱后即可完成注册。</div>
        </>
      )}
    </>
  );
}
